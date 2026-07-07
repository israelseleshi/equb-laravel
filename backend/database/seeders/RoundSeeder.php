<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Round;
use Carbon\Carbon;

class RoundSeeder extends Seeder
{
    public function run(): void
    {
        $rounds = [
            [
                'name' => 'Daily 500 ETB Circle',
                'category' => '500',
                'amount' => 500,
                'frequency' => 'daily',
                'people_goal' => 10,
                'current_participants' => 8,
                'total_rounds' => 12,
                'winners_per_spin' => 2,
                'current_round_number' => 1,
                'start_date' => Carbon::today()->subDays(5)->toDateString(),
                'end_date' => Carbon::today()->addDays(55)->toDateString(),
                'status' => 'active',
                'auto_spin_enabled' => true,
                'spin_time' => '08:00',
                'commission_rate' => 10.00,
            ],
            [
                'name' => 'Weekly 1,000 ETB Circle',
                'category' => '1000',
                'amount' => 1000,
                'frequency' => 'weekly',
                'people_goal' => 8,
                'current_participants' => 5,
                'total_rounds' => 8,
                'winners_per_spin' => 2,
                'current_round_number' => 1,
                'start_date' => Carbon::today()->subWeeks(2)->toDateString(),
                'end_date' => Carbon::today()->addWeeks(6)->toDateString(),
                'status' => 'active',
                'auto_spin_enabled' => true,
                'spin_time' => '08:00',
                'commission_rate' => 10.00,
            ],
            [
                'name' => 'Monthly 2,000 ETB Circle',
                'category' => '2000',
                'amount' => 2000,
                'frequency' => 'monthly',
                'people_goal' => 6,
                'current_participants' => 3,
                'total_rounds' => 6,
                'winners_per_spin' => 1,
                'current_round_number' => 1,
                'start_date' => Carbon::today()->toDateString(),
                'end_date' => Carbon::today()->addMonths(6)->toDateString(),
                'status' => 'draft',
                'auto_spin_enabled' => true,
                'spin_time' => '08:00',
                'commission_rate' => 10.00,
            ],
            [
                'name' => 'Premium 5,000 ETB Circle',
                'category' => '5000',
                'amount' => 5000,
                'frequency' => 'monthly',
                'people_goal' => 4,
                'current_participants' => 0,
                'total_rounds' => 4,
                'winners_per_spin' => 1,
                'current_round_number' => 1,
                'start_date' => null,
                'end_date' => null,
                'status' => 'draft',
                'auto_spin_enabled' => true,
                'spin_time' => '08:00',
                'commission_rate' => 8.00,
            ],
        ];

        foreach ($rounds as $round) {
            Round::create($round);
        }
    }
}
