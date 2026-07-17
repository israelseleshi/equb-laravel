<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'])) {
            DB::statement("ALTER TABLE rounds MODIFY COLUMN frequency ENUM('daily','weekly','monthly','2_month') NOT NULL DEFAULT 'daily'");
        }
        // SQLite stores ENUM as TEXT with CHECK constraint – no explicit migration needed.
        // The Round model's fillable already accepts any frequency string.
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'])) {
            DB::statement("ALTER TABLE rounds MODIFY COLUMN frequency ENUM('daily','weekly','monthly') NOT NULL DEFAULT 'daily'");
        }
    }
};
