<?php

namespace Database\Factories;

use App\Models\PaymentLog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PaymentLog>
 */
class PaymentLogFactory extends Factory
{
    protected $model = PaymentLog::class;

    public function definition(): array
    {
        return [
            'user_id' => \App\Models\User::factory(),
            'user_name' => fake()->name(),
            'amount' => 500,
            'status' => 'success',
            'payment_gateway' => 'Telebirr',
            'trans_ref' => 'TXN' . strtoupper(uniqid()),
        ];
    }

    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'failed',
        ]);
    }
}
