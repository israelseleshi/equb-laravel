<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Round;
use App\Models\Slot;
use App\Models\Draw;
use App\Models\User;
use Illuminate\Http\Request;
use Carbon\Carbon;

class RoundController extends Controller
{
    public function index(Request $request)
    {
        $query = Round::query();

        if ($request->status) {
            $query->where('status', $request->status);
        }
        if ($request->category) {
            $query->where('category', $request->category);
        }

        $rounds = $query->orderBy('created_at', 'desc')->get();

        return response()->json(['rounds' => $rounds]);
    }

    public function show($id)
    {
        $round = Round::with(['slots', 'slots.user', 'draws'])->findOrFail($id);

        return response()->json(['round' => $round]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|string|in:100,500,1000,2000,5000',
            'amount' => 'required|numeric|min:1',
            'frequency' => 'required|in:daily,weekly,monthly',
            'people_goal' => 'required|integer|min:2|max:100',
            'total_rounds' => 'required|integer|min:1|max:52',
            'winners_per_spin' => 'nullable|integer|min:1|max:10',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'auto_spin_enabled' => 'nullable|boolean',
            'spin_time' => 'nullable|string',
            'commission_rate' => 'nullable|numeric|min:0|max:50',
        ]);

        $round = Round::create([
            'name' => $validated['name'],
            'category' => $validated['category'],
            'amount' => $validated['amount'],
            'frequency' => $validated['frequency'],
            'people_goal' => $validated['people_goal'],
            'current_participants' => 0,
            'total_rounds' => $validated['total_rounds'],
            'winners_per_spin' => $validated['winners_per_spin'] ?? 1,
            'current_round_number' => 1,
            'start_date' => $validated['start_date'] ?? Carbon::today()->toDateString(),
            'end_date' => $validated['end_date'] ?? null,
            'status' => 'draft',
            'auto_spin_enabled' => $validated['auto_spin_enabled'] ?? true,
            'spin_time' => $validated['spin_time'] ?? '08:00',
            'commission_rate' => $validated['commission_rate'] ?? 10.00,
        ]);

        return response()->json(['round' => $round], 201);
    }

    public function update(Request $request, $id)
    {
        $round = Round::findOrFail($id);

        if ($round->status === 'completed') {
            return response()->json(['message' => 'Cannot edit a completed round'], 422);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category' => 'sometimes|string|in:100,500,1000,2000,5000',
            'amount' => 'sometimes|numeric|min:1',
            'frequency' => 'sometimes|in:daily,weekly,monthly',
            'people_goal' => 'sometimes|integer|min:2|max:100',
            'total_rounds' => 'sometimes|integer|min:1|max:52',
            'winners_per_spin' => 'sometimes|integer|min:1|max:10',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'auto_spin_enabled' => 'nullable|boolean',
            'spin_time' => 'nullable|string',
            'commission_rate' => 'nullable|numeric|min:0|max:50',
            'status' => 'sometimes|in:draft,active,completed,cancelled',
        ]);

        $round->update($validated);

        return response()->json(['round' => $round]);
    }

    public function destroy($id)
    {
        $round = Round::findOrFail($id);

        if ($round->status === 'active') {
            return response()->json(['message' => 'Cannot delete an active round. Cancel it first.'], 422);
        }

        $round->delete();

        return response()->json(['message' => 'Round deleted']);
    }

    public function activate($id)
    {
        $round = Round::findOrFail($id);

        if ($round->status !== 'draft') {
            return response()->json(['message' => 'Only draft rounds can be activated'], 422);
        }

        $round->update([
            'status' => 'active',
            'start_date' => $round->start_date ?? Carbon::today()->toDateString(),
        ]);

        return response()->json(['round' => $round]);
    }

    public function complete($id)
    {
        $round = Round::findOrFail($id);

        if ($round->status !== 'active') {
            return response()->json(['message' => 'Only active rounds can be completed'], 422);
        }

        $round->update(['status' => 'completed']);

        return response()->json(['round' => $round]);
    }

    public function cancel($id)
    {
        $round = Round::findOrFail($id);

        if ($round->status === 'completed') {
            return response()->json(['message' => 'Cannot cancel a completed round'], 422);
        }

        $round->update(['status' => 'cancelled']);

        return response()->json(['round' => $round]);
    }

    public function enroll(Request $request, $id)
    {
        $round = Round::findOrFail($id);

        if ($round->status !== 'active') {
            return response()->json(['message' => 'Round is not active'], 422);
        }

        if ($round->isFull()) {
            return response()->json(['message' => 'Round is full'], 422);
        }

        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $existingSlot = Slot::where('user_id', $request->user_id)
            ->where('round_id', $round->id)
            ->first();

        if ($existingSlot) {
            return response()->json(['message' => 'User already enrolled in this round'], 422);
        }

        $slotNumber = Slot::where('round_id', $round->id)->count() + 1;

        $slot = Slot::create([
            'user_id' => $request->user_id,
            'round_id' => $round->id,
            'category' => $round->category,
            'slot_number' => $slotNumber,
            'status' => 'active',
            'registration_date' => now()->toDateString(),
        ]);

        $round->incrementParticipants();

        return response()->json(['slot' => $slot, 'round' => $round], 201);
    }

    public function unenroll(Request $request, $id)
    {
        $round = Round::findOrFail($id);

        $request->validate([
            'slot_id' => 'required|exists:slots,id',
        ]);

        $slot = Slot::where('id', $request->slot_id)
            ->where('round_id', $round->id)
            ->firstOrFail();

        $slot->update(['round_id' => null]);
        $round->decrementParticipants();

        return response()->json(['message' => 'User unenrolled', 'round' => $round]);
    }

    public function manualSpin(Request $request, $id)
    {
        $round = Round::findOrFail($id);

        if ($round->status !== 'active') {
            return response()->json(['message' => 'Round is not active'], 422);
        }

        if ($round->current_participants < $round->people_goal) {
            return response()->json([
                'message' => "Goal not reached. {$round->current_participants}/{$round->people_goal} participants enrolled.",
            ], 422);
        }

        $slots = Slot::where('round_id', $round->id)
            ->where('category', $round->category)
            ->where('status', 'active')
            ->where('has_won', false)
            ->get();

        if ($slots->isEmpty()) {
            return response()->json(['message' => 'No eligible slots'], 400);
        }

        $winner = $slots->random();
        $dailyAmount = (float) $round->amount;
        $commissionRate = (float) $round->commission_rate / 100;
        $totalCollected = $dailyAmount * $slots->count();
        $commissionAmount = $totalCollected * $commissionRate;
        $netPayout = $totalCollected - $commissionAmount;

        $draw = Draw::create([
            'spin_id' => 'SPIN-' . strtoupper(uniqid()),
            'round' => $round->current_round_number,
            'round_id' => $round->id,
            'category' => $round->category,
            'winning_slot' => $winner->slot_number,
            'winner_name' => $winner->user->name ?? 'Unknown',
            'net_payout' => $netPayout,
            'commission_amount' => $commissionAmount,
            'total_collected' => $totalCollected,
            'draw_date' => now(),
            'is_auto' => false,
        ]);

        $winner->update(['has_won' => true]);

        return response()->json(['draw' => $draw, 'round' => $round]);
    }

    public function roundStats()
    {
        $totalRounds = Round::count();
        $activeRounds = Round::where('status', 'active')->count();
        $draftRounds = Round::where('status', 'draft')->count();
        $completedRounds = Round::where('status', 'completed')->count();
        $totalPayouts = Draw::where('round_id', '!=', null)->sum('net_payout');
        $totalDraws = Draw::where('round_id', '!=', null)->count();

        $byCategory = Round::selectRaw('category, count(*) as total, sum(current_participants) as participants')
            ->groupBy('category')
            ->get();

        return response()->json([
            'total_rounds' => $totalRounds,
            'active_rounds' => $activeRounds,
            'draft_rounds' => $draftRounds,
            'completed_rounds' => $completedRounds,
            'total_payouts' => $totalPayouts,
            'total_draws' => $totalDraws,
            'by_category' => $byCategory,
        ]);
    }
}
