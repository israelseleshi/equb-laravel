<?php

use App\Models\SavingsTransaction;
use App\Models\Slot;
use App\Models\User;

/* ───────────────────────────────────────────
   1. Get savings index for owned slot
   ─────────────────────────────────────────── */
test('user can get savings for their slot', function () {
    ['user' => $user, 'token' => $token] = createMember();
    $slot = Slot::factory()->create(['user_id' => $user->id]);

    SavingsTransaction::factory()->deposit()->create([
        'user_id' => $user->id,
        'slot_id' => $slot->id,
        'amount' => 1000,
        'net_amount' => 1000,
    ]);

    $response = $this->withToken($token)
        ->getJson("/api/savings/{$slot->id}");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'balance', 'total_deposits', 'total_withdrawn', 'deposits', 'withdrawals',
        ]);
});

/* ───────────────────────────────────────────
   2. Cannot get savings for other's slot
   ─────────────────────────────────────────── */
test('user cannot get savings for another user slot', function () {
    ['token' => $token] = createMember();
    $otherSlot = Slot::factory()->create();

    $response = $this->withToken($token)
        ->getJson("/api/savings/{$otherSlot->id}");

    $response->assertStatus(404);
});

/* ───────────────────────────────────────────
   3. Deposit to savings
   ─────────────────────────────────────────── */
test('user can deposit to their savings slot', function () {
    ['user' => $user, 'token' => $token] = createMember();
    $slot = Slot::factory()->create(['user_id' => $user->id]);

    $response = $this->withToken($token)
        ->postJson('/api/savings/deposit', [
            'slot_id' => $slot->id,
            'amount' => 500,
        ]);

    $response->assertStatus(201)
        ->assertJsonStructure(['transaction'])
        ->assertJsonPath('transaction.type', 'deposit');
});

/* ───────────────────────────────────────────
   4. Withdraw from savings (sufficient balance)
   ─────────────────────────────────────────── */
test('user can withdraw from savings with sufficient balance', function () {
    ['user' => $user, 'token' => $token] = createMember();
    $slot = Slot::factory()->create(['user_id' => $user->id]);

    // First deposit enough
    SavingsTransaction::factory()->deposit()->create([
        'user_id' => $user->id,
        'slot_id' => $slot->id,
        'amount' => 2000,
        'net_amount' => 2000,
    ]);

    $response = $this->withToken($token)
        ->postJson('/api/savings/withdraw', [
            'slot_id' => $slot->id,
        ]);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
        ])
        ->assertJsonStructure(['transaction', 'commission', 'net_amount']);
});

/* ───────────────────────────────────────────
   5. Withdraw fails with insufficient balance
   ─────────────────────────────────────────── */
test('withdraw fails with insufficient balance', function () {
    ['user' => $user, 'token' => $token] = createMember();
    $slot = Slot::factory()->create(['user_id' => $user->id]);

    $response = $this->withToken($token)
        ->postJson('/api/savings/withdraw', [
            'slot_id' => $slot->id,
        ]);

    $response->assertStatus(400)
        ->assertJson(['success' => false]);
});

/* ───────────────────────────────────────────
   6. Get savings statement
   ─────────────────────────────────────────── */
test('user can download savings statement', function () {
    ['user' => $user, 'token' => $token] = createMember();
    $slot = Slot::factory()->create(['user_id' => $user->id]);

    SavingsTransaction::factory()->count(3)->create([
        'user_id' => $user->id,
        'slot_id' => $slot->id,
    ]);

    $response = $this->withToken($token)
        ->getJson("/api/savings/statement/{$slot->id}");

    $response->assertStatus(200)
        ->assertJsonStructure(['transactions'])
        ->assertJsonCount(3, 'transactions');
});
