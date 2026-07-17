<?php

use App\Models\Draw;
use App\Models\Slot;
use App\Models\User;

/* ───────────────────────────────────────────
   1. Get draw tiers
   ─────────────────────────────────────────── */
test('anyone can get draw tiers', function () {
    Slot::factory()->create(['category' => '500', 'status' => 'active']);

    $response = $this->getJson('/api/tiers');

    $response->assertStatus(200)
        ->assertJsonStructure(['tiers', 'active_rounds'])
        ->assertJsonCount(4, 'tiers');
});

/* ───────────────────────────────────────────
   2. Get recent draws
   ─────────────────────────────────────────── */
test('anyone can get recent draws', function () {
    Draw::factory()->count(3)->create();

    $response = $this->getJson('/api/draws/recent');

    $response->assertStatus(200)
        ->assertJsonStructure(['draws'])
        ->assertJsonCount(3, 'draws');
});

/* ───────────────────────────────────────────
   3. Get draws by category
   ─────────────────────────────────────────── */
test('anyone can get draws by category', function () {
    Draw::factory()->count(2)->create(['category' => '500']);
    Draw::factory()->create(['category' => '1000']);

    $response = $this->getJson('/api/draws/500');

    $response->assertStatus(200)
        ->assertJsonCount(2, 'draws');
});

/* ───────────────────────────────────────────
   4. Authenticated user can spin
   ─────────────────────────────────────────── */
test('authenticated user can spin for eligible slots', function () {
    ['user' => $user, 'token' => $token] = createMember();
    $slot = Slot::factory()->create([
        'user_id' => $user->id,
        'category' => '500',
        'status' => 'active',
        'has_won' => false,
    ]);
    // Need at least one more active slot for the pool
    Slot::factory()->create([
        'category' => '500',
        'status' => 'active',
        'has_won' => false,
    ]);

    $response = $this->withToken($token)
        ->postJson('/api/draws/spin', [
            'category' => '500',
        ]);

    $response->assertStatus(200)
        ->assertJsonStructure(['draw']);
});

/* ───────────────────────────────────────────
   5. Spin fails with no eligible slots
   ─────────────────────────────────────────── */
test('spin fails when no eligible slots', function () {
    ['user' => $user, 'token' => $token] = createMember();

    $response = $this->withToken($token)
        ->postJson('/api/draws/spin', [
            'category' => '500',
        ]);

    $response->assertStatus(400);
});

/* ───────────────────────────────────────────
   6. Shake (Lucky Shake draw)
   ─────────────────────────────────────────── */
test('authenticated user can shake for global pool', function () {
    ['user' => $user, 'token' => $token] = createMember();
    $round = \App\Models\Round::factory()->active()->create();
    $slot = Slot::factory()->create([
        'user_id' => $user->id,
        'round_id' => $round->id,
        'category' => '500',
        'status' => 'active',
        'has_won' => false,
    ]);
    Slot::factory()->create([
        'round_id' => $round->id,
        'category' => '500',
        'status' => 'active',
        'has_won' => false,
    ]);

    $response = $this->withToken($token)
        ->postJson('/api/draw/shake');

    $response->assertStatus(200)
        ->assertJsonStructure(['draw', 'winner', 'total_eligible'])
        ->assertJsonMissingPath('winner.user_name'); // Privacy-first: no name in public
});
