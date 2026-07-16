<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Round;
use App\Models\Slot;
use App\Models\Draw;
use Carbon\Carbon;

class AutoSpinCommand extends Command
{
    protected $signature = 'equb:auto-spin';
    protected $description = 'Run automatic draws for active rounds at 11:00 AM EAT based on frequency';

    public function handle(): int
    {
        $now = Carbon::now();

        $this->info('[' . $now->toDateTimeString() . '] Starting auto-spin...');

        $activeRounds = Round::where('status', 'active')
            ->where('auto_spin_enabled', true)
            ->get();

        if ($activeRounds->isEmpty()) {
            $this->info('No active rounds with auto-spin enabled. Skipping.');
            return self::SUCCESS;
        }

        $results = [];

        foreach ($activeRounds as $round) {
            if (!$this->isDue($round, $now)) {
                $results[] = [
                    'round_id' => $round->id,
                    'success' => false,
                    'message' => 'Skipped by frequency schedule',
                ];
                continue;
            }

            $result = $this->spinRound($round);
            $results[] = $result;

            if ($result['success']) {
                $round->update(['last_auto_draw_at' => $now]);
            }

            $this->info("  Round [{$round->id}] {$round->name}: {$result['message']}");
        }

        $this->info('Auto-spin complete. Processed ' . count($results) . ' round(s).');

        return self::SUCCESS;
    }

    private function isDue(Round $round, Carbon $now): bool
    {
        $last = $round->last_auto_draw_at;

        if (!$last) {
            return true;
        }

        $last = Carbon::parse($last);

        return match ($round->frequency) {
            'daily' => $now->greaterThanOrEqualTo($last->copy()->addDay()),
            'weekly' => $now->greaterThanOrEqualTo($last->copy()->addWeek()),
            'monthly' => $now->greaterThanOrEqualTo($last->copy()->addMonth()),
            '2_month' => $now->greaterThanOrEqualTo($last->copy()->addMonths(2)),
            default => true,
        };
    }

    private function spinRound(Round $round): array
    {
        if ($round->current_participants < $round->people_goal) {
            return ['success' => false, 'message' => "Goal not reached ({$round->current_participants}/{$round->people_goal})"];
        }

        $slots = Slot::where('round_id', $round->id)
            ->where('category', $round->category)
            ->where('status', 'active')
            ->where('has_won', false)
            ->get();

        if ($slots->isEmpty()) {
            return ['success' => false, 'message' => 'No eligible slots'];
        }

        if ($slots->count() < 2) {
            return ['success' => false, 'message' => 'Not enough participants (' . $slots->count() . '/' . $round->people_goal . ')'];
        }

        $winner = $slots->random();
        $dailyAmount = (float) $round->amount;
        $commissionRate = (float) $round->commission_rate / 100;
        $totalCollected = $dailyAmount * $slots->count();
        $commissionAmount = $totalCollected * $commissionRate;
        $netPayout = $totalCollected - $commissionAmount;

        $draw = Draw::create([
            'spin_id' => 'AUTO-' . strtoupper(uniqid()),
            'round' => $round->current_round_number,
            'round_id' => $round->id,
            'category' => $round->category,
            'winning_slot' => $winner->slot_number,
            'winner_name' => $winner->user->name ?? 'Unknown',
            'net_payout' => $netPayout,
            'commission_amount' => $commissionAmount,
            'total_collected' => $totalCollected,
            'draw_date' => Carbon::now(),
            'is_auto' => true,
        ]);

        $winner->update(['has_won' => true]);

        $this->logDrawResult($round, $draw, $winner);

        return [
            'success' => true,
            'message' => "Winner: {$winner->user->name} (Slot #{$winner->slot_number}) - Payout: {$netPayout} ETB",
            'draw' => $draw,
        ];
    }

    private function logDrawResult(Round $round, Draw $draw, Slot $winner): void
    {
        $this->info("    Spin ID: {$draw->spin_id}");
        $this->info("    Category: {$round->category} ETB");
        $this->info("    Round: {$round->current_round_number}");
        $this->info("    Winner: {$draw->winner_name}");
        $this->info("    Slot: #{$draw->winning_slot}");
        $this->info("    Total Collected: {$draw->total_collected} ETB");
        $this->info("    Commission: {$draw->commission_amount} ETB");
        $this->info("    Net Payout: {$draw->net_payout} ETB");
    }
}
