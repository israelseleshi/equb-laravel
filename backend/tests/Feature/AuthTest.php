<?php

use App\Models\User;
use App\Models\Category;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;

/* ───────────────────────────────────────────
   1. Register with valid data
   ─────────────────────────────────────────── */
test('user can register with valid data', function () {
    // Need a category for the 'category' validation
    Category::factory()->create([
        'code' => '500',
        'label_en' => '500 ETB',
        'label_am' => '500 ብር',
        'amount' => 500,
        'frequency' => 'daily',
        'max_members' => 50,
        'total_rounds' => 30,
        'is_active' => true,
    ]);

    $response = $this->postJson('/api/register', [
        'name' => 'Test Member',
        'phone' => '0911000001',
        'password' => 'secret123',
        'category' => '500',
    ]);

    $response->assertStatus(201)
        ->assertJsonStructure([
            'user' => ['id', 'name', 'phone', 'role'],
            'slot' => ['id', 'category', 'slot_number'],
            'token',
        ]);

    $this->assertDatabaseHas('users', [
        'phone' => '0911000001',
        'role' => 'member',
    ]);

    $this->assertDatabaseHas('slots', [
        'category' => '500',
        'slot_number' => 1,
    ]);
});

/* ───────────────────────────────────────────
   2. Register with duplicate phone
   ─────────────────────────────────────────── */
test('user cannot register with duplicate phone', function () {
    Category::factory()->create([
        'code' => '500',
        'amount' => 500,
        'frequency' => 'daily',
        'max_members' => 50,
        'total_rounds' => 30,
        'is_active' => true,
    ]);

    User::factory()->create(['phone' => '0911000001']);

    $response = $this->postJson('/api/register', [
        'name' => 'Another Member',
        'phone' => '0911000001',
        'password' => 'secret123',
        'category' => '500',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['phone']);
});

/* ───────────────────────────────────────────
   3. Login with correct credentials
   ─────────────────────────────────────────── */
test('user can login with correct credentials', function () {
    $user = User::factory()->member()->create([
        'phone' => '0911000001',
        'password' => Hash::make('secret123'),
    ]);

    $response = $this->postJson('/api/login', [
        'phone' => '0911000001',
        'password' => 'secret123',
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'role' => 'member',
        ])
        ->assertJsonStructure([
            'user', 'slots', 'token',
        ]);
});

/* ───────────────────────────────────────────
   4. Login with wrong password
   ─────────────────────────────────────────── */
test('user cannot login with wrong password', function () {
    $user = User::factory()->member()->create([
        'phone' => '0911000001',
        'password' => Hash::make('secret123'),
    ]);

    $response = $this->postJson('/api/login', [
        'phone' => '0911000001',
        'password' => 'wrongpassword',
    ]);

    $response->assertStatus(401)
        ->assertJson([
            'success' => false,
        ]);
});

/* ───────────────────────────────────────────
   5. Forgot password flow
   ─────────────────────────────────────────── */
test('forgot password sends reset code', function () {
    User::factory()->member()->create([
        'phone' => '0911000001',
    ]);

    $response = $this->postJson('/api/forgot-password', [
        'phone' => '0911000001',
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'message' => 'Reset code sent to your phone',
        ]);

    $this->assertNotNull(Cache::get('otp_0911000001'));
});

/* ───────────────────────────────────────────
   6. Reset password with valid OTP
   ─────────────────────────────────────────── */
test('user can reset password with valid OTP and token', function () {
    $user = User::factory()->member()->create([
        'phone' => '0911000001',
        'password' => Hash::make('oldpassword'),
    ]);

    // Simulate OTP verification
    Cache::put('otp_0911000001', [
        'otp' => '123456',
        'expires_at' => now()->addMinutes(10),
    ], 600);

    $verifyResponse = $this->postJson('/api/verify-otp', [
        'phone' => '0911000001',
        'otp' => '123456',
    ]);

    $verifyResponse->assertStatus(200)
        ->assertJsonStructure(['reset_token']);

    $resetToken = $verifyResponse->json('reset_token');

    $resetResponse = $this->postJson('/api/reset-password', [
        'phone' => '0911000001',
        'password' => 'newpassword123',
        'password_confirmation' => 'newpassword123',
        'reset_token' => $resetToken,
    ]);

    $resetResponse->assertStatus(200)
        ->assertJson(['message' => 'Password reset successfully']);

    $this->assertTrue(Hash::check('newpassword123', $user->fresh()->password));
});

/* ───────────────────────────────────────────
   7. Get authenticated user
   ─────────────────────────────────────────── */
test('authenticated user can get their profile', function () {
    ['user' => $user, 'token' => $token] = createMember();

    $response = $this->withToken($token)
        ->getJson('/api/me');

    $response->assertStatus(200)
        ->assertJsonStructure(['user', 'slots', 'role'])
        ->assertJsonPath('user.id', $user->id);
});

/* ───────────────────────────────────────────
   8. Logout clears current session token
   ─────────────────────────────────────────── */
test('user can logout successfully', function () {
    ['token' => $token] = createMember();

    $logoutResponse = $this->withToken($token)
        ->postJson('/api/logout');

    $logoutResponse->assertStatus(200)
        ->assertJson(['message' => 'Logged out successfully']);
});
