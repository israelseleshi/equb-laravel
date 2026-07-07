<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('savings_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('slot_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['deposit', 'withdrawal']);
            $table->decimal('amount', 12, 2);
            $table->decimal('commission', 12, 2)->default(0);
            $table->decimal('net_amount', 12, 2);
            $table->string('trans_ref')->nullable();
            $table->string('method')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('savings_transactions');
    }
};
