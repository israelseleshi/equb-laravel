<?php

use App\Models\Slot;
use App\Models\Draw;
use App\Models\PaymentLog;
use App\Models\User;
use App\Models\Setting;

/* ───────────────────────────────────────────
   1. Admin gets dashboard stats
   ─────────────────────────────────────────── */
test('admin can get dashboard stats', function () {
    User::factory()->member()->count(3)->create();

    $response = adminGet('/admin/stats');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'total_users', 'total_slots', 'active_slots', 'lien_slots',
            'total_balance', 'total_payouts', 'delinquent_slots',
            'slots_by_category', 'active_rounds', 'total_rounds',
        ]);
});

/* ───────────────────────────────────────────
   2. Admin lists members
   ─────────────────────────────────────────── */
test('admin can list members', function () {
    User::factory()->member()->count(5)->create();

    $response = adminGet('/admin/members');

    $response->assertStatus(200)
        ->assertJsonStructure(['members' => ['data', 'current_page', 'last_page', 'total']]);
});

/* ───────────────────────────────────────────
   3. Admin lists winners
   ─────────────────────────────────────────── */
test('admin can list winners', function () {
    Draw::factory()->count(3)->create();

    $response = adminGet('/admin/winners');

    $response->assertStatus(200)
        ->assertJsonStructure(['winners' => ['data', 'current_page', 'last_page', 'total']]);
});

/* ───────────────────────────────────────────
   4. Admin lists payment logs
   ─────────────────────────────────────────── */
test('admin can list payment logs', function () {
    PaymentLog::factory()->count(3)->create();

    $response = adminGet('/admin/payments');

    $response->assertStatus(200)
        ->assertJsonStructure(['payments' => ['data', 'current_page', 'last_page', 'total']]);
});

/* ───────────────────────────────────────────
   5. Admin can run a draw
   ─────────────────────────────────────────── */
test('admin can run a draw', function () {
    Slot::factory()->create([
        'category' => '500',
        'status' => 'active',
        'has_won' => false,
    ]);
    Slot::factory()->create([
        'category' => '500',
        'status' => 'active',
        'has_won' => false,
    ]);

    $response = adminPost('/admin/draw', ['category' => '500']);

    $response->assertStatus(200)
        ->assertJsonStructure(['draw']);
});

/* ───────────────────────────────────────────
   6. Admin process payout with correct PIN
   ─────────────────────────────────────────── */
test('admin can process payout with correct PIN', function () {
    $draw = Draw::factory()->create();

    // Set the payout PIN
    Setting::factory()->create([
        'key' => 'admin_payout_pin',
        'value' => ['pin' => '123456'],
    ]);

    $response = adminPost('/admin/payout', [
        'draw_id' => $draw->id,
        'password' => '123456',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure(['message', 'draw']);
});

/* ───────────────────────────────────────────
   7. Admin payout fails with wrong PIN
   ─────────────────────────────────────────── */
test('admin payout fails with wrong PIN', function () {
    $draw = Draw::factory()->create();

    Setting::factory()->create([
        'key' => 'admin_payout_pin',
        'value' => ['pin' => '123456'],
    ]);

    $response = adminPost('/admin/payout', [
        'draw_id' => $draw->id,
        'password' => 'wrongpin',
    ]);

    $response->assertStatus(422);
});
