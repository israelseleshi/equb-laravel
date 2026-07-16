<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->engine('InnoDB');
            $table->string('code', 20)->unique();
            $table->string('label_en');
            $table->string('label_am');
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('frequency', 20)->default('daily');
            $table->integer('max_members')->default(10);
            $table->decimal('min_deposit', 12, 2)->default(0);
            $table->integer('total_rounds')->default(30);
            $table->string('collateral_type', 50)->nullable();
            $table->string('license_type', 100)->nullable();
            $table->boolean('requires_license')->default(false);
            $table->text('penalty_clause_en')->nullable();
            $table->text('penalty_clause_am')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index('code');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
