<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
        'slot_id', 'user_id', 'day_index', 'date',
        'amount', 'status', 'trans_ref', 'method',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'date' => 'date',
        ];
    }

    public function slot()
    {
        return $this->belongsTo(Slot::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
