<?php

namespace Database\Factories;

use App\Models\Round;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Round>
 */
class RoundFactory extends Factory
{
    protected $model = Round::class;

    public function definition(): array
    {
        $category = fake()->randomElement(['100', '500', '1000']);
        return [
            'name' => fake()->words(3, true),
            'category' => $category,
            'amount' => (int)$category,
            'frequency' => fake()->randomElement(['daily', 'weekly', 'monthly']),
            'people_goal' => 10,
            'current_participants' => 0,
            'total_rounds' => 30,
            'winners_per_spin' => 1,
            'current_round_number' => 1,
            'status' => 'draft',
            'auto_spin_enabled' => true,
            'spin_time' => '08:00',
            'commission_rate' => 10.00,
            'metadata' => null,
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'draft',
            'current_participants' => 0,
        ]);
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
            'current_participants' => 10,
            'start_date' => now()->toDateString(),
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'current_round_number' => 30,
            'end_date' => now()->toDateString(),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'cancelled',
        ]);
    }
}
