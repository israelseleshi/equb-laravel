<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Slot;
use App\Models\Draw;
use App\Models\Setting;
use App\Models\SavingsTransaction;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Admin user
        User::create([
            'name' => 'Admin',
            'phone' => '0920190438',
            'email' => 'admin@equb.com',
            'password' => '87654321',
            'role' => 'admin',
            'status' => 'active',
            'registration_date' => '2026-01-01',
        ]);

        // Demo member
        $member = User::create([
            'name' => 'Abebe Kebede',
            'phone' => '0907082821',
            'email' => 'abebe@example.com',
            'password' => '12345678',
            'role' => 'member',
            'status' => 'active',
            'work_address' => 'Addis Ababa, Ethiopia',
            'registration_date' => '2026-01-15',
        ]);

        // Member slots
        $slot1 = Slot::create([
            'user_id' => $member->id,
            'category' => '500',
            'slot_number' => 1,
            'status' => 'active',
            'balance' => 0,
            'registration_date' => '2026-01-15',
        ]);

        Slot::create([
            'user_id' => $member->id,
            'category' => '500',
            'slot_number' => 2,
            'status' => 'active',
            'balance' => 0,
            'registration_date' => '2026-01-15',
        ]);

        Slot::create([
            'user_id' => $member->id,
            'category' => '1000',
            'slot_number' => 1,
            'status' => 'active',
            'balance' => 0,
            'registration_date' => '2026-02-01',
        ]);

        // Demo draws
        Draw::create([
            'spin_id' => 's1', 'round' => 1, 'category' => '500',
            'winning_slot' => 3, 'winner_name' => 'Tigist Haile',
            'net_payout' => 4500, 'commission_amount' => 500,
            'total_collected' => 5000, 'draw_date' => '2026-06-15',
        ]);

        Draw::create([
            'spin_id' => 's2', 'round' => 1, 'category' => '500',
            'winning_slot' => 7, 'winner_name' => 'Dawit Hailu',
            'net_payout' => 4500, 'commission_amount' => 500,
            'total_collected' => 5000, 'draw_date' => '2026-06-01',
        ]);

        Draw::create([
            'spin_id' => 's3', 'round' => 1, 'category' => '1000',
            'winning_slot' => 2, 'winner_name' => 'Birtukan Ayele',
            'net_payout' => 7000, 'commission_amount' => 1000,
            'total_collected' => 8000, 'draw_date' => '2026-05-20',
        ]);

        Draw::create([
            'spin_id' => 's4', 'round' => 1, 'category' => '2000',
            'winning_slot' => 1, 'winner_name' => 'Abebe Kebede',
            'net_payout' => 10000, 'commission_amount' => 2000,
            'total_collected' => 12000, 'draw_date' => '2026-05-10',
        ]);

        // Demo savings transactions
        SavingsTransaction::create([
            'user_id' => $member->id, 'slot_id' => $slot1->id,
            'type' => 'deposit', 'amount' => 100,
            'commission' => 0, 'net_amount' => 100,
            'trans_ref' => 'DEP-001', 'method' => 'USSD',
        ]);
        SavingsTransaction::create([
            'user_id' => $member->id, 'slot_id' => $slot1->id,
            'type' => 'deposit', 'amount' => 200,
            'commission' => 0, 'net_amount' => 200,
            'trans_ref' => 'DEP-002', 'method' => 'USSD',
        ]);
        SavingsTransaction::create([
            'user_id' => $member->id, 'slot_id' => $slot1->id,
            'type' => 'withdrawal', 'amount' => 1000,
            'commission' => 20, 'net_amount' => 980,
            'trans_ref' => 'WTH-001', 'method' => 'USSD',
        ]);

        // Settings
        Setting::create(['key' => 'app', 'value' => json_encode([
            'first_run_complete' => true,
        ])]);

        $this->call(RoundSeeder::class);
    }
}
