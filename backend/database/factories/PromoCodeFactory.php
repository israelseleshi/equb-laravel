<?php

namespace Database\Factories;

use App\Models\PromoCode;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PromoCode>
 */
class PromoCodeFactory extends Factory
{
    protected $model = PromoCode::class;

    public function definition(): array
    {
        return [
            'code' => 'PROMO-' . strtoupper(fake()->bothify('??????')),
            'broker_name' => fake()->name(),
            'broker_phone' => fake()->numerify('091#######'),
            'commission_rate' => 2.00,
            'total_registrations' => 0,
            'total_earned' => 0,
            'status' => 'active',
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'inactive',
        ]);
    }
}
