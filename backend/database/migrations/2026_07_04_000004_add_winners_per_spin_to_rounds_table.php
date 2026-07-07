<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rounds', function (Blueprint $table) {
            $table->integer('winners_per_spin')->default(1)->after('total_rounds');
        });
    }

    public function down(): void
    {
        Schema::table('rounds', function (Blueprint $table) {
            $table->dropColumn('winners_per_spin');
        });
    }
};
