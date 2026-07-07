<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Slot extends Model
{
    protected $fillable = [
        'user_id', 'round_id', 'category', 'slot_number', 'status',
        'has_won', 'deal_closed', 'balance',
        'consecutive_missed_sweeps', 'deposited_today',
        'unique_payment_code', 'payout_code', 'registration_date',
    ];

    protected function casts(): array
    {
        return [
            'has_won' => 'boolean',
            'deal_closed' => 'boolean',
            'deposited_today' => 'boolean',
            'balance' => 'decimal:2',
            'registration_date' => 'date',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function round()
    {
        return $this->belongsTo(Round::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function savingsTransactions()
    {
        return $this->hasMany(SavingsTransaction::class);
    }
}
