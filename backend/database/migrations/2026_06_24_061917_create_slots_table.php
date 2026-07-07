<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('category', 20);
            $table->integer('slot_number');
            $table->enum('status', ['active', 'lien'])->default('active');
            $table->boolean('has_won')->default(false);
            $table->boolean('deal_closed')->default(false);
            $table->decimal('balance', 12, 2)->default(0);
            $table->integer('consecutive_missed_sweeps')->default(0);
            $table->boolean('deposited_today')->default(false);
            $table->string('unique_payment_code')->nullable();
            $table->string('payout_code')->nullable();
            $table->date('registration_date');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('slots');
    }
};
