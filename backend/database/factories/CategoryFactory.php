<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Category>
 */
class CategoryFactory extends Factory
{
    protected $model = Category::class;

    public function definition(): array
    {
        return [
            'code' => fake()->unique()->randomElement(['100', '500', '1000', '2000', '5000', 'savings']),
            'label_en' => 'Test Category',
            'label_am' => 'የሙከራ ምድብ',
            'amount' => 500,
            'frequency' => 'daily',
            'max_members' => 50,
            'min_deposit' => 0,
            'total_rounds' => 30,
            'collateral_type' => 'none',
            'requires_license' => false,
            'is_active' => true,
            'sort_order' => 0,
            'metadata' => null,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
