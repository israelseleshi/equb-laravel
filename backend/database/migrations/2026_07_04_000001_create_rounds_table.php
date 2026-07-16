<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rounds', function (Blueprint $table) {
            $table->id();
            $table->engine('InnoDB');
            $table->string('name');
            $table->string('category', 20);
            $table->decimal('amount', 12, 2);
            $table->enum('frequency', ['daily', 'weekly', 'monthly']);
            $table->integer('people_goal');
            $table->integer('current_participants')->default(0);
            $table->integer('total_rounds')->default(1);
            $table->integer('current_round_number')->default(1);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->enum('status', ['draft', 'active', 'completed', 'cancelled'])->default('draft');
            $table->boolean('auto_spin_enabled')->default(true);
            $table->time('spin_time')->default('08:00');
            $table->decimal('commission_rate', 5, 2)->default(10.00);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['category', 'status']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rounds');
    }
};
