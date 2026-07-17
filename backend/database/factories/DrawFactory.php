<?php

namespace Database\Factories;

use App\Models\Draw;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Draw>
 */
class DrawFactory extends Factory
{
    protected $model = Draw::class;

    public function definition(): array
    {
        return [
            'spin_id' => 'SPIN-' . strtoupper(uniqid()),
            'round' => 1,
            'category' => '500',
            'winning_slot' => 1,
            'winner_name' => fake()->name(),
            'net_payout' => 450,
            'commission_amount' => 50,
            'total_collected' => 500,
            'draw_date' => now(),
            'is_auto' => false,
        ];
    }

    public function auto(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_auto' => true,
        ]);
    }
}
