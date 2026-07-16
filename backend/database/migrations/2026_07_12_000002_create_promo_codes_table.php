<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promo_codes', function (Blueprint $table) {
            $table->id();
            $table->engine('InnoDB');
            $table->string('code', 20)->unique();
            $table->string('broker_name');
            $table->string('broker_phone', 20);
            $table->decimal('commission_rate', 5, 2)->default(2.00);
            $table->integer('total_registrations')->default(0);
            $table->decimal('total_earned', 12, 2)->default(0);
            $table->string('status', 20)->default('active');
            $table->timestamps();

            $table->index('code');
            $table->index('broker_phone');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promo_codes');
    }
};
