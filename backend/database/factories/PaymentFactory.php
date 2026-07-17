<?php

namespace Database\Factories;

use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Payment>
 */
class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    public function definition(): array
    {
        return [
            'slot_id' => \App\Models\Slot::factory(),
            'user_id' => \App\Models\User::factory(),
            'day_index' => 1,
            'date' => now()->toDateString(),
            'amount' => 500,
            'status' => 'unpaid',
            'trans_ref' => null,
            'method' => null,
        ];
    }

    public function paid(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'paid',
            'trans_ref' => 'TXN' . strtoupper(uniqid()),
            'method' => 'USSD',
        ]);
    }
}
