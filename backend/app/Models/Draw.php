<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Draw extends Model
{
    use HasFactory;
    protected $fillable = [
        'spin_id', 'round', 'round_id', 'category', 'winning_slot',
        'winner_name', 'net_payout', 'commission_amount',
        'total_collected', 'draw_date', 'is_auto',
    ];

    protected function casts(): array
    {
        return [
            'net_payout' => 'decimal:2',
            'commission_amount' => 'decimal:2',
            'total_collected' => 'decimal:2',
            'draw_date' => 'datetime',
            'is_auto' => 'boolean',
        ];
    }

    public function roundModel()
    {
        return $this->belongsTo(Round::class, 'round_id');
    }
}
