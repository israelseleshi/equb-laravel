<?php

namespace Database\Factories;

use App\Models\SavingsTransaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SavingsTransaction>
 */
class SavingsTransactionFactory extends Factory
{
    protected $model = SavingsTransaction::class;

    public function definition(): array
    {
        return [
            'user_id' => \App\Models\User::factory(),
            'slot_id' => \App\Models\Slot::factory(),
            'type' => 'deposit',
            'amount' => 500,
            'commission' => 0,
            'net_amount' => 500,
            'trans_ref' => 'DEP-' . strtoupper(uniqid()),
            'method' => 'USSD',
        ];
    }

    public function deposit(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'deposit',
            'commission' => 0,
            'net_amount' => $this->state['amount'] ?? 500,
        ]);
    }

    public function withdrawal(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'withdrawal',
            'commission' => 10,
            'net_amount' => 490,
        ]);
    }
}
