<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Round extends Model
{
    protected $fillable = [
        'name', 'category', 'amount', 'frequency', 'people_goal',
        'current_participants', 'total_rounds', 'winners_per_spin',
        'current_round_number', 'start_date', 'end_date', 'status',
        'auto_spin_enabled', 'last_auto_draw_at',
        'spin_time', 'commission_rate', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'commission_rate' => 'decimal:2',
            'start_date' => 'date',
            'end_date' => 'date',
            'auto_spin_enabled' => 'boolean',
            'last_auto_draw_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function slots()
    {
        return $this->hasMany(Slot::class);
    }

    public function draws()
    {
        return $this->hasMany(Draw::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isFull(): bool
    {
        return $this->current_participants >= $this->people_goal;
    }

    public function incrementParticipants(): void
    {
        $this->increment('current_participants');
    }

    public function decrementParticipants(): void
    {
        $this->decrement('current_participants');
    }
}
