<?php

use App\Models\User;

/* ───────────────────────────────────────────
   1. Update profile (authenticated)
   ─────────────────────────────────────────── */
test('authenticated user can update their profile', function () {
    ['user' => $user, 'token' => $token] = createMember();

    $response = $this->withToken($token)
        ->putJson('/api/profile', [
            'name' => 'Updated Name',
            'email' => 'updated@example.com',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('user.name', 'Updated Name')
        ->assertJsonPath('user.email', 'updated@example.com');

    $this->assertEquals('Updated Name', $user->fresh()->name);
});

/* ───────────────────────────────────────────
   2. Update profile without auth (should fail)
   ─────────────────────────────────────────── */
test('unauthenticated user cannot update profile', function () {
    $response = $this->putJson('/api/profile', [
        'name' => 'Hacker Name',
    ]);

    $response->assertStatus(401);
});
