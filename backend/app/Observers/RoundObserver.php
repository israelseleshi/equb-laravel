<?php

namespace App\Observers;

use App\Events\RoundConfigurationChanged;
use App\Models\Round;
use App\Models\Slot;
use App\Models\Payment;
use App\Models\Draw;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class RoundObserver
{
    public function created(Round $round): void
    {
        DB::transaction(function () use ($round) {
            $this->recalculatePoolVolume($round);
            $this->syncActiveSlots($round);

            event(new RoundConfigurationChanged($round, 'created'));
        });
    }

    public function updated(Round $round): void
    {
        $changed = $round->getDirty();
        $criticalFields = ['amount', 'frequency', 'people_goal', 'total_rounds', 'commission_rate', 'status'];

        $hasCriticalChange = !empty(array_intersect(array_keys($changed), $criticalFields));

        if (!$hasCriticalChange) {
            event(new RoundConfigurationChanged($round, 'updated', array_keys($changed)));
            return;
        }

        DB::transaction(function () use ($round, $changed) {
            if (isset($changed['amount']) || isset($changed['commission_rate'])) {
                $this->recalculatePoolVolume($round);
            }

            if (isset($changed['people_goal'])) {
                $this->resizeSlotCapacity($round);
            }

            if (isset($changed['frequency']) || isset($changed['total_rounds'])) {
                $this->regeneratePaymentSchedules($round);
            }

            if (isset($changed['status'])) {
                $this->handleStatusChange($round, $changed['status']);
            }

            $this->recalculateActiveStats($round);

            event(new RoundConfigurationChanged($round, 'updated', array_keys($changed)));
        });
    }

    public function deleted(Round $round): void
    {
        DB::transaction(function () use ($round) {
            Slot::where('round_id', $round->id)->update([
                'round_id' => null,
                'status' => 'cancelled',
            ]);

            Draw::where('round_id', $round->id)->update([
                'round_id' => null,
            ]);

            event(new RoundConfigurationChanged($round, 'deleted'));
        });
    }

    private function recalculatePoolVolume(Round $round): void
    {
        $poolVolume = (float) $round->amount * (int) $round->people_goal;
        $commissionTotal = $poolVolume * ((float) $round->commission_rate / 100);
        $netPool = $poolVolume - $commissionTotal;

        $round->metadata = array_merge($round->metadata ?? [], [
            'pool_volume' => $poolVolume,
            'commission_total' => $commissionTotal,
            'net_pool' => $netPool,
            'per_member_distribution' => $poolVolume / max(1, (int) $round->people_goal),
            'last_recalculated_at' => now()->toIso8601String(),
        ]);

        $round->saveQuietly();
    }

    private function syncActiveSlots(Round $round): void
    {
        $slots = Slot::where('round_id', $round->id)
            ->where('status', 'active')
            ->get();

        $round->current_participants = $slots->count();

        if ($round->current_participants > 0) {
            $this->recalculateSlotBalances($round, $slots);
        }

        $round->saveQuietly();
    }

    private function recalculateSlotBalances(Round $round, $slots): void
    {
        $totalRounds = (int) $round->total_rounds;
        $dailyAmount = (float) $round->amount;
        $expectedTotalPerSlot = $dailyAmount * $totalRounds;

        foreach ($slots as $slot) {
            $paidCount = Payment::where('slot_id', $slot->id)
                ->where('status', 'paid')
                ->count();

            $slot->balance = ($dailyAmount * $paidCount);
            $slot->saveQuietly();
        }
    }

    private function resizeSlotCapacity(Round $round): void
    {
        $currentCount = Slot::where('round_id', $round->id)->count();
        $newGoal = (int) $round->people_goal;

        if ($currentCount > $newGoal) {
            $excess = Slot::where('round_id', $round->id)
                ->where('status', 'active')
                ->orderBy('id', 'desc')
                ->take($currentCount - $newGoal)
                ->get();

            foreach ($excess as $slot) {
                $slot->update([
                    'round_id' => null,
                    'status' => 'cancelled',
                ]);
            }
        }

        $round->current_participants = min($currentCount, $newGoal);
        $round->saveQuietly();
    }

    private function regeneratePaymentSchedules(Round $round): void
    {
        $slots = Slot::where('round_id', $round->id)
            ->where('status', 'active')
            ->get();

        $frequency = $round->frequency;
        $totalRounds = (int) $round->total_rounds;
        $dailyAmount = (float) $round->amount;
        $baseDate = $round->start_date ? Carbon::parse($round->start_date) : Carbon::today();

        foreach ($slots as $slot) {
            Payment::where('slot_id', $slot->id)->delete();

            for ($i = 0; $i < $totalRounds; $i++) {
                $dueDate = match ($frequency) {
                    'weekly' => (clone $baseDate)->addWeeks($i),
                    'monthly' => (clone $baseDate)->addMonths($i),
                    default => (clone $baseDate)->addDays($i),
                };

                Payment::create([
                    'slot_id' => $slot->id,
                    'user_id' => $slot->user_id,
                    'day_index' => $i + 1,
                    'date' => $dueDate->toDateString(),
                    'amount' => $dailyAmount,
                    'status' => 'unpaid',
                ]);
            }
        }
    }

    private function handleStatusChange(Round $round, string $newStatus): void
    {
        match ($newStatus) {
            'active' => $this->onActivate($round),
            'completed' => $this->onComplete($round),
            'cancelled' => $this->onCancel($round),
            default => null,
        };
    }

    private function onActivate(Round $round): void
    {
        if (!$round->start_date) {
            $round->start_date = Carbon::today()->toDateString();
            $round->saveQuietly();
        }

        $slots = Slot::where('round_id', $round->id)
            ->where('status', 'active')
            ->get();

        if ($slots->isEmpty()) {
            return;
        }

        $frequency = $round->frequency;
        $totalRounds = (int) $round->total_rounds;
        $dailyAmount = (float) $round->amount;
        $baseDate = Carbon::parse($round->start_date);

        foreach ($slots as $slot) {
            $existingCount = Payment::where('slot_id', $slot->id)->count();
            if ($existingCount > 0) {
                continue;
            }

            for ($i = 0; $i < $totalRounds; $i++) {
                $dueDate = match ($frequency) {
                    'weekly' => (clone $baseDate)->addWeeks($i),
                    'monthly' => (clone $baseDate)->addMonths($i),
                    default => (clone $baseDate)->addDays($i),
                };

                Payment::create([
                    'slot_id' => $slot->id,
                    'user_id' => $slot->user_id,
                    'day_index' => $i + 1,
                    'date' => $dueDate->toDateString(),
                    'amount' => $dailyAmount,
                    'status' => 'unpaid',
                ]);
            }
        }
    }

    private function onComplete(Round $round): void
    {
        $round->end_date = Carbon::today()->toDateString();
        $round->saveQuietly();
    }

    private function onCancel(Round $round): void
    {
        Slot::where('round_id', $round->id)
            ->where('status', 'active')
            ->update(['status' => 'cancelled', 'round_id' => null]);

        $round->current_participants = 0;
        $round->saveQuietly();
    }

    private function recalculateActiveStats(Round $round): void
    {
        $totalSlots = Slot::where('round_id', $round->id)->count();
        $paidSlots = Payment::whereIn('slot_id', function ($q) use ($round) {
            $q->select('id')->from('slots')->where('round_id', $round->id);
        })->where('status', 'paid')->count();

        $totalExpectedPayments = Payment::whereIn('slot_id', function ($q) use ($round) {
            $q->select('id')->from('slots')->where('round_id', $round->id);
        })->count();

        $paymentRate = $totalExpectedPayments > 0
            ? round(($paidSlots / $totalExpectedPayments) * 100, 2)
            : 0;

        $round->metadata = array_merge($round->metadata ?? [], [
            'stats' => [
                'total_slots' => $totalSlots,
                'paid_payments' => $paidSlots,
                'total_expected_payments' => $totalExpectedPayments,
                'payment_rate' => $paymentRate,
                'missed_payments' => $totalExpectedPayments - $paidSlots,
            ],
        ]);

        $round->saveQuietly();
    }
}
