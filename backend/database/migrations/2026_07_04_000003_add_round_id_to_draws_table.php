<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('draws', function (Blueprint $table) {
            $table->foreignId('round_id')->nullable()->after('round')->constrained()->nullOnDelete();
            $table->boolean('is_auto')->default(false)->after('draw_date');
        });
    }

    public function down(): void
    {
        Schema::table('draws', function (Blueprint $table) {
            $table->dropForeign(['round_id']);
            $table->dropColumn(['round_id', 'is_auto']);
        });
    }
};
