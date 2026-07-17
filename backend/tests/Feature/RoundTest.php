<?php

use App\Models\Round;
use App\Models\Slot;
use App\Models\User;

/* ───────────────────────────────────────────
   1. List rounds (public)
   ─────────────────────────────────────────── */
test('anyone can list rounds', function () {
    Round::factory()->count(3)->create();

    $response = $this->getJson('/api/rounds');

    $response->assertStatus(200)
        ->assertJsonStructure(['rounds'])
        ->assertJsonCount(3, 'rounds');
});

/* ───────────────────────────────────────────
   2. Show round with details
   ─────────────────────────────────────────── */
test('anyone can view a specific round', function () {
    $round = Round::factory()->draft()->create();

    $response = $this->getJson("/api/rounds/{$round->id}");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'round' => ['id', 'name', 'category', 'status', 'slots', 'draws'],
        ]);
});

/* ───────────────────────────────────────────
   3. Create round (admin)
   ─────────────────────────────────────────── */
test('admin can create a round', function () {
    $response = adminPost('/admin/rounds', [
        'name' => 'Test Round',
        'category' => '500',
        'amount' => 500,
        'frequency' => 'daily',
        'people_goal' => 10,
        'total_rounds' => 30,
        'commission_rate' => 10,
    ]);

    $response->assertStatus(201)
        ->assertJsonStructure(['round'])
        ->assertJsonPath('round.status', 'draft');
});

/* ───────────────────────────────────────────
   4. Update round (admin)
   ─────────────────────────────────────────── */
test('admin can update a draft round', function () {
    $round = Round::factory()->draft()->create(['name' => 'Old Name']);

    $response = adminPut('/admin/rounds/' . $round->id, [
        'name' => 'Updated Round Name',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('round.name', 'Updated Round Name');
});

/* ───────────────────────────────────────────
   5. Cannot update completed round
   ─────────────────────────────────────────── */
test('admin cannot update a completed round', function () {
    $round = Round::factory()->completed()->create();

    $response = adminPut('/admin/rounds/' . $round->id, [
        'name' => 'Should Fail',
    ]);

    $response->assertStatus(422);
});

/* ───────────────────────────────────────────
   6. Delete draft round (admin)
   ─────────────────────────────────────────── */
test('admin can delete a draft round', function () {
    $round = Round::factory()->draft()->create();

    $response = $this->deleteJson('/api/rounds/' . $round->id);

    $response->assertStatus(200)
        ->assertJson(['message' => 'Round deleted']);

    $this->assertModelMissing($round);
});

/* ───────────────────────────────────────────
   7. Cannot delete active round
   ─────────────────────────────────────────── */
test('admin cannot delete an active round', function () {
    $round = Round::factory()->active()->create();

    $response = adminDelete('/admin/rounds/' . $round->id);

    $response->assertStatus(422);
});

/* ───────────────────────────────────────────
   8. Activate round only if full
   ─────────────────────────────────────────── */
test('draft round cannot be activated without reaching goal', function () {
    $round = Round::factory()->draft()->create(['people_goal' => 10]);

    $response = adminPost('/admin/rounds/' . $round->id . '/activate');

    $response->assertStatus(422);
});

/* ───────────────────────────────────────────
   9. Complete an active round
   ─────────────────────────────────────────── */
test('active round can be completed', function () {
    $round = Round::factory()->active()->create();

    $response = adminPost('/admin/rounds/' . $round->id . '/complete');

    $response->assertStatus(200)
        ->assertJsonPath('round.status', 'completed');
});

/* ───────────────────────────────────────────
   10. Cancel a round
   ─────────────────────────────────────────── */
test('active round can be cancelled', function () {
    $round = Round::factory()->active()->create();

    $response = adminPost('/admin/rounds/' . $round->id . '/cancel');

    $response->assertStatus(200)
        ->assertJsonPath('round.status', 'cancelled');
});
