<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromoCode extends Model
{
    protected $fillable = [
        'code',
        'broker_name',
        'broker_phone',
        'commission_rate',
        'total_registrations',
        'total_earned',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'commission_rate' => 'decimal:2',
            'total_registrations' => 'integer',
            'total_earned' => 'decimal:2',
        ];
    }

    public function users()
    {
        return $this->hasMany(User::class, 'promo_code', 'code');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function incrementRegistrations(float $amount = 0): void
    {
        $this->increment('total_registrations');
        if ($amount > 0) {
            $earned = round($amount * ($this->commission_rate / 100), 2);
            $this->increment('total_earned', $earned);
        }
    }
}
