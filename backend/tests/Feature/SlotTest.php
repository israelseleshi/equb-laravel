<?php

use App\Models\Slot;
use App\Models\User;

/* ───────────────────────────────────────────
   1. List authenticated user slots
   ─────────────────────────────────────────── */
test('authenticated user can list their slots', function () {
    ['user' => $user, 'token' => $token] = createMember();
    Slot::factory()->count(2)->create(['user_id' => $user->id]);

    $response = $this->withToken($token)
        ->getJson('/api/slots');

    $response->assertStatus(200)
        ->assertJsonStructure(['slots'])
        ->assertJsonCount(2, 'slots');
});

/* ───────────────────────────────────────────
   2. Create a slot (authenticated)
   ─────────────────────────────────────────── */
test('authenticated user can create a slot', function () {
    ['user' => $user, 'token' => $token] = createMember();

    $response = $this->withToken($token)
        ->postJson('/api/slots', [
            'category' => '500',
        ]);

    $response->assertStatus(201)
        ->assertJsonStructure(['slot'])
        ->assertJsonPath('slot.user_id', $user->id);
});

/* ───────────────────────────────────────────
   3. Cannot list slots without auth
   ─────────────────────────────────────────── */
test('unauthenticated user cannot list slots', function () {
    $response = $this->getJson('/api/slots');

    $response->assertStatus(401);
});

/* ───────────────────────────────────────────
   4. Cannot create slot without auth
   ─────────────────────────────────────────── */
test('unauthenticated user cannot create a slot', function () {
    $response = $this->postJson('/api/slots', [
        'category' => '500',
    ]);

    $response->assertStatus(401);
});
