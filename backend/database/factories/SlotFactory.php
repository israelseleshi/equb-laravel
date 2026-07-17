<?php

namespace Database\Factories;

use App\Models\Slot;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Slot>
 */
class SlotFactory extends Factory
{
    protected $model = Slot::class;

    public function definition(): array
    {
        return [
            'user_id' => \App\Models\User::factory(),
            'category' => '500',
            'slot_number' => 1,
            'status' => 'active',
            'has_won' => false,
            'deal_closed' => false,
            'balance' => 0,
            'consecutive_missed_sweeps' => 0,
            'deposited_today' => false,
            'registration_date' => now()->toDateString(),
        ];
    }

    public function lien(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'lien',
        ]);
    }

    public function won(): static
    {
        return $this->state(fn (array $attributes) => [
            'has_won' => true,
        ]);
    }
}
