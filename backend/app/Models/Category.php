<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;
    protected $fillable = [
        'code',
        'label_en',
        'label_am',
        'amount',
        'frequency',
        'max_members',
        'min_deposit',
        'total_rounds',
        'collateral_type',
        'license_type',
        'requires_license',
        'penalty_clause_en',
        'penalty_clause_am',
        'is_active',
        'sort_order',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'min_deposit' => 'decimal:2',
            'max_members' => 'integer',
            'total_rounds' => 'integer',
            'requires_license' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function rounds()
    {
        return $this->hasMany(Round::class, 'category', 'code');
    }

    public function slots()
    {
        return $this->hasMany(Slot::class, 'category', 'code');
    }

    public function isRegistrationOpen(): bool
    {
        return $this->is_active && $this->slots()->count() < $this->max_members;
    }
}
