<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('draws', function (Blueprint $table) {
            $table->id();
            $table->string('spin_id')->unique();
            $table->integer('round');
            $table->string('category', 20);
            $table->integer('winning_slot');
            $table->string('winner_name');
            $table->decimal('net_payout', 12, 2);
            $table->decimal('commission_amount', 12, 2)->default(0);
            $table->decimal('total_collected', 12, 2)->default(0);
            $table->timestamp('draw_date');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('draws');
    }
};
