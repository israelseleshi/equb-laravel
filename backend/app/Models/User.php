<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name', 'phone', 'email', 'password', 'fayda_id',
        'role', 'status', 'work_address', 'registration_date',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'registration_date' => 'date',
        ];
    }

    public function slots()
    {
        return $this->hasMany(Slot::class);
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
