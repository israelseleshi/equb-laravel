<?php

namespace App\Listeners;

use App\Events\RoundConfigurationChanged;
use App\Models\Slot;
use App\Models\Payment;
use Illuminate\Support\Facades\Cache;

class RecalculatePoolOnRoundChange
{
    public function handle(RoundConfigurationChanged $event): void
    {
        $round = $event->round;

        $totalSlots = Slot::where('round_id', $round->id)->count();
        $activeSlots = Slot::where('round_id', $round->id)->where('status', 'active')->count();
        $lienSlots = Slot::where('round_id', $round->id)->where('status', 'lien')->count();

        $totalPaid = Payment::whereIn('slot_id', function ($q) use ($round) {
            $q->select('id')->from('slots')->where('round_id', $round->id);
        })->where('status', 'paid')->sum('amount');

        $totalExpected = (float) $round->amount * (int) $round->total_rounds * max(1, $activeSlots);
        $totalCollected = Payment::whereIn('slot_id', function ($q) use ($round) {
            $q->select('id')->from('slots')->where('round_id', $round->id);
        })->sum('amount');

        $paymentRate = $totalExpected > 0 ? round(($totalPaid / $totalExpected) * 100, 2) : 0;

        $cacheKey = "round_stats_{$round->id}";
        Cache::put($cacheKey, [
            'round_id' => $round->id,
            'total_slots' => $totalSlots,
            'active_slots' => $activeSlots,
            'lien_slots' => $lienSlots,
            'total_paid' => $totalPaid,
            'total_expected' => $totalExpected,
            'total_collected' => $totalCollected,
            'payment_rate' => $paymentRate,
            'pool_volume' => $round->metadata['pool_volume'] ?? 0,
            'net_pool' => $round->metadata['net_pool'] ?? 0,
            'last_updated' => now()->toIso8601String(),
            'event_action' => $event->action,
        ], 3600);
    }
}
