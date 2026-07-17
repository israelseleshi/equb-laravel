<?php

use App\Models\Payment;
use App\Models\Slot;
use App\Models\User;

/* ───────────────────────────────────────────
   1. Get payment schedule for slot
   ─────────────────────────────────────────── */
test('authenticated user can get payment schedule for own slot', function () {
    ['user' => $user, 'token' => $token] = createMember();
    $slot = Slot::factory()->create(['user_id' => $user->id]);
    Payment::factory()->count(3)->create([
        'slot_id' => $slot->id,
        'user_id' => $user->id,
    ]);

    $response = $this->withToken($token)
        ->getJson("/api/payments/{$slot->id}");

    $response->assertStatus(200)
        ->assertJsonStructure(['payments', 'slot'])
        ->assertJsonCount(3, 'payments');
});

/* ───────────────────────────────────────────
   2. Cannot get payment schedule for other user's slot
   ─────────────────────────────────────────── */
test('user cannot get payment schedule for another user slot', function () {
    ['user' => $user, 'token' => $token] = createMember();
    $otherSlot = \App\Models\Slot::factory()->create(); // belongs to different user

    $response = $this->withToken($token)
        ->getJson("/api/payments/{$otherSlot->id}");

    $response->assertStatus(404);
});

/* ───────────────────────────────────────────
   3. Pay a day (success)
   ─────────────────────────────────────────── */
test('user can mark a payment day as paid', function () {
    ['user' => $user, 'token' => $token] = createMember();
    $slot = Slot::factory()->create(['user_id' => $user->id]);
    $payment = Payment::factory()->create([
        'slot_id' => $slot->id,
        'user_id' => $user->id,
        'day_index' => 1,
        'status' => 'unpaid',
    ]);

    $response = $this->withToken($token)
        ->postJson('/api/payments/pay', [
            'slot_id' => $slot->id,
            'day_index' => 1,
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('payment.status', 'paid');

    $this->assertDatabaseHas('payment_logs', [
        'amount' => $payment->amount,
        'status' => 'success',
    ]);
});

/* ───────────────────────────────────────────
   4. Pay multiple days
   ─────────────────────────────────────────── */
test('user can pay multiple days at once', function () {
    ['user' => $user, 'token' => $token] = createMember();
    $slot = Slot::factory()->create(['user_id' => $user->id]);
    Payment::factory()->create([
        'slot_id' => $slot->id,
        'user_id' => $user->id,
        'day_index' => 1,
        'status' => 'unpaid',
    ]);
    Payment::factory()->create([
        'slot_id' => $slot->id,
        'user_id' => $user->id,
        'day_index' => 2,
        'status' => 'unpaid',
    ]);

    $response = $this->withToken($token)
        ->postJson('/api/payments/pay-multiple', [
            'slot_id' => $slot->id,
            'day_indices' => [1, 2],
        ]);

    $response->assertStatus(200)
        ->assertJsonCount(2, 'payments');
});

/* ───────────────────────────────────────────
   5. Get payment receipt (own)
   ─────────────────────────────────────────── */
test('user can view their own payment receipt', function () {
    ['user' => $user, 'token' => $token] = createMember();
    $slot = Slot::factory()->create(['user_id' => $user->id]);
    $payment = Payment::factory()->paid()->create([
        'slot_id' => $slot->id,
        'user_id' => $user->id,
    ]);

    $response = $this->withToken($token)
        ->getJson("/api/payments/receipt/{$payment->id}");

    $response->assertStatus(200)
        ->assertJsonStructure(['payment']);
});

/* ───────────────────────────────────────────
   6. Cannot view other user's receipt
   ─────────────────────────────────────────── */
test('user cannot view another user payment receipt', function () {
    ['user' => $user, 'token' => $token] = createMember();
    $otherPayment = Payment::factory()->paid()->create();

    $response = $this->withToken($token)
        ->getJson("/api/payments/receipt/{$otherPayment->id}");

    $response->assertStatus(403);
});
