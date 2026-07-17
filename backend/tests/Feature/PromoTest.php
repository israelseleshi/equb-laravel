<?php

use App\Models\PromoCode;
use App\Models\User;

/* ───────────────────────────────────────────
   1. Admin can list promo codes
   ─────────────────────────────────────────── */
test('admin can list promo codes', function () {
    PromoCode::factory()->count(3)->create();

    $response = adminGet('/admin/promos');

    $response->assertStatus(200)
        ->assertJsonStructure(['promo_codes'])
        ->assertJsonCount(3, 'promo_codes');
});

/* ───────────────────────────────────────────
   2. Admin can create promo code
   ─────────────────────────────────────────── */
test('admin can create a promo code', function () {
    $response = adminPost('/admin/promos', [
        'broker_name' => 'Test Broker',
        'broker_phone' => '0911000001',
        'commission_rate' => 5.00,
    ]);

    $response->assertStatus(201)
        ->assertJsonStructure(['promo_code'])
        ->assertJsonPath('promo_code.broker_name', 'Test Broker');
});

/* ───────────────────────────────────────────
   3. Admin can get promo stats
   ─────────────────────────────────────────── */
test('admin can get promo stats', function () {
    PromoCode::factory()->create();

    $response = adminGet('/admin/promos/stats');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'total_brokers', 'active_brokers', 'total_registrations', 'total_paid_out', 'registrations_today',
        ]);
});

/* ───────────────────────────────────────────
   4. Validate valid promo code
   ─────────────────────────────────────────── */
test('anyone can validate an active promo code', function () {
    $promo = PromoCode::factory()->create(['code' => 'PROMO-TEST', 'status' => 'active']);

    $response = $this->postJson('/api/promo/validate', [
        'code' => 'PROMO-TEST',
    ]);

    $response->assertStatus(200)
        ->assertJson(['valid' => true]);
});

/* ───────────────────────────────────────────
   5. Validate invalid promo code
   ─────────────────────────────────────────── */
test('anyone can validate an invalid promo code', function () {
    $response = $this->postJson('/api/promo/validate', [
        'code' => 'NONEXISTENT',
    ]);

    $response->assertStatus(200)
        ->assertJson(['valid' => false]);
});
