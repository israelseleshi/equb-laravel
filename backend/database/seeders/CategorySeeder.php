<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'code' => '500',
                'label_en' => '500 ETB - Small Trader',
                'label_am' => '500 ብር - አነስተኛ ነጋዴ',
                'amount' => 500,
                'frequency' => 'daily',
                'max_members' => 10,
                'min_deposit' => 500,
                'total_rounds' => 30,
                'collateral_type' => 'trade_license',
                'license_type' => 'Trade License (የንግድ ፍቃድ)',
                'requires_license' => true,
                'penalty_clause_en' => 'Trade License REVOCATION + Business prohibition in case of default.',
                'penalty_clause_am' => 'የንግድ ፍቃዴ ይሰረዛል እና ማንኛውንም የንግድ እንቅስቃሴ ከማድረግ እከለከላለሁ።',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'code' => '1000',
                'label_en' => '1,000 ETB - Local Transport',
                'label_am' => '1,000 ብር - የአካባቢ ትራንስፖርት',
                'amount' => 1000,
                'frequency' => 'daily',
                'max_members' => 8,
                'min_deposit' => 1000,
                'total_rounds' => 30,
                'collateral_type' => 'driving_license',
                'license_type' => 'Driving License (የመንጃ ፍቃድ)',
                'requires_license' => true,
                'penalty_clause_en' => 'Driving License IMMEDIATE SUSPENSION in case of default.',
                'penalty_clause_am' => 'የመንጃ ፍቃዴ ወዲያውኑ ይታገዳል እና ማንኛውንም ተሽከርካሪ ከማሽከርከር እከለከላለሁ።',
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'code' => '2000',
                'label_en' => '2,000 ETB - Government Worker',
                'label_am' => '2,000 ብር - የመንግስት ሰራተኛ',
                'amount' => 2000,
                'frequency' => 'daily',
                'max_members' => 6,
                'min_deposit' => 2000,
                'total_rounds' => 30,
                'collateral_type' => 'salary_withholding',
                'license_type' => 'Employer Letter (የአሰሪ ደብዳቤ)',
                'requires_license' => true,
                'penalty_clause_en' => 'Full Monthly Salary GARNISHMENT in case of default.',
                'penalty_clause_am' => 'ሙሉ ወርሃዊ ደሞዜ ከመንግስት ደሞዝ ይቆረጣል እና ዕዳዬን እስከምከፍል ድረስ አይሰጠኝም።',
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'code' => '5000',
                'label_en' => '5,000 ETB - Big Merchant',
                'label_am' => '5,000 ብር - ትልቅ ነጋዴ',
                'amount' => 5000,
                'frequency' => 'weekly',
                'max_members' => 4,
                'min_deposit' => 5000,
                'total_rounds' => 12,
                'collateral_type' => 'trade_license',
                'license_type' => 'Trade License (የንግድ ፍቃድ)',
                'requires_license' => true,
                'penalty_clause_en' => 'Trade License REVOCATION + Business prohibition in case of default.',
                'penalty_clause_am' => 'የንግድ ፍቃዴ ይሰረዛል እና ማንኛውንም የንግድ እንቅስቃሴ ከማድረግ እከለከላለሁ።',
                'is_active' => true,
                'sort_order' => 4,
            ],
        ];

        foreach ($categories as $cat) {
            Category::create($cat);
        }

        $this->command->info('Categories seeded successfully!');
    }
}
