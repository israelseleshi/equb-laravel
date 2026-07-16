<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE rounds MODIFY COLUMN frequency ENUM('daily','weekly','monthly','2_month') NOT NULL DEFAULT 'daily'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE rounds MODIFY COLUMN frequency ENUM('daily','weekly','monthly') NOT NULL DEFAULT 'daily'");
    }
};
