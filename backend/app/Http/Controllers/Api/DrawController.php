<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Draw;
use App\Models\Slot;
use App\Models\Round;
use Illuminate\Http\Request;

class DrawController extends Controller
{
    public function tiers()
    {
        $tiers = [
            ['code' => '500', 'label' => '500 ETB', 'target' => 10, 'amount' => 500],
            ['code' => '1000', 'label' => '1,000 ETB', 'target' => 8, 'amount' => 1000],
            ['code' => '2000', 'label' => '2,000 ETB', 'target' => 6, 'amount' => 2000],
            ['code' => '5000', 'label' => '5,000 ETB', 'target' => 4, 'amount' => 5000],
        ];

        foreach ($tiers as &$tier) {
            $slots = Slot::where('category', $tier['code'])->count();
            $round = $tier['target'] > 0 ? floor($slots / $tier['target']) + 1 : 1;
            $current = $slots % $tier['target'];
            $tier['total_slots'] = $slots;
            $tier['current_round'] = (int)$round;
            $tier['current_count'] = $current;
            $tier['is_full'] = $slots > 0 && $current === 0;
            $tier['percentage'] = $tier['target'] > 0 ? round(($current / $tier['target']) * 100) : 0;
        }

        $activeRounds = Round::where('status', 'active')->get()->map(function ($r) {
            return [
                'id' => $r->id,
                'name' => $r->name,
                'category' => $r->category,
                'amount' => $r->amount,
                'frequency' => $r->frequency,
                'people_goal' => $r->people_goal,
                'current_participants' => $r->current_participants,
                'status' => $r->status,
            ];
        });

        return response()->json(['tiers' => $tiers, 'active_rounds' => $activeRounds]);
    }

    public function recent()
    {
        $draws = Draw::orderBy('draw_date', 'desc')->take(20)->get();
        return response()->json(['draws' => $draws]);
    }

    public function byCategory($category)
    {
        $draws = Draw::where('category', $category)->orderBy('draw_date', 'desc')->get();
        return response()->json(['draws' => $draws]);
    }

    public function spin(Request $request)
    {
        $request->validate([
            'category' => 'required|string|in:500,1000,2000,5000',
            'round_id' => 'nullable|exists:rounds,id',
        ]);

        if ($request->round_id) {
            $round = Round::findOrFail($request->round_id);

            if ($round->status !== 'active') {
                return response()->json(['message' => 'Round is not active'], 422);
            }

            $slots = Slot::where('round_id', $round->id)
                ->where('category', $round->category)
                ->where('status', 'active')
                ->where('has_won', false)
                ->get();

            $dailyAmount = (float) $round->amount;
            $commissionRate = (float) $round->commission_rate / 100;
        } else {
            $slots = Slot::where('category', $request->category)
                ->where('status', 'active')
                ->where('has_won', false)
                ->get();

            $dailyAmount = (int) $request->category;
            $commissionRate = 0.1;
            $round = null;
        }

        if ($slots->isEmpty()) {
            return response()->json(['message' => 'No eligible slots'], 400);
        }

        $winner = $slots->random();
        $roundNumber = $round ? $round->current_round_number : Draw::where('category', $request->category)->count() + 1;
        $totalCollected = $dailyAmount * $slots->count();
        $commissionAmount = $totalCollected * $commissionRate;
        $netPayout = $totalCollected - $commissionAmount;

        $draw = Draw::create([
            'spin_id' => 'SPIN-' . strtoupper(uniqid()),
            'round' => $roundNumber,
            'round_id' => $round?->id,
            'category' => $round ? $round->category : $request->category,
            'winning_slot' => $winner->slot_number,
            'winner_name' => $winner->user->name ?? 'Unknown',
            'net_payout' => $netPayout,
            'commission_amount' => $commissionAmount,
            'total_collected' => $totalCollected,
            'draw_date' => now(),
            'is_auto' => false,
        ]);

        $winner->update(['has_won' => true]);

        return response()->json(['draw' => $draw]);
    }
}
