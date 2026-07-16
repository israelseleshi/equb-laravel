<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Slot;
use App\Models\Draw;
use App\Models\PaymentLog;
use App\Models\SavingsTransaction;
use App\Models\Setting;
use App\Models\Round;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function stats()
    {
        $totalUsers = User::where('role', 'member')->count();
        $totalSlots = Slot::count();
        $activeSlots = Slot::where('status', 'active')->count();
        $lienSlots = Slot::where('status', 'lien')->count();
        $totalBalance = Slot::sum('balance');
        $totalPayouts = Draw::sum('net_payout');
        $delinquentSlots = Slot::where('consecutive_missed_sweeps', '>', 0)->count();

        $slotsByCategory = Slot::selectRaw('category, count(*) as total, sum(balance) as balance')
            ->groupBy('category')
            ->get();

        $activeRounds = Round::where('status', 'active')->count();
        $totalRounds = Round::count();

        return response()->json([
            'total_users' => $totalUsers,
            'total_slots' => $totalSlots,
            'active_slots' => $activeSlots,
            'lien_slots' => $lienSlots,
            'total_balance' => $totalBalance,
            'total_payouts' => $totalPayouts,
            'delinquent_slots' => $delinquentSlots,
            'slots_by_category' => $slotsByCategory,
            'active_rounds' => $activeRounds,
            'total_rounds' => $totalRounds,
        ]);
    }

    public function members(Request $request)
    {
        $query = User::with('slots')->where('role', 'member');

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('phone', 'like', "%{$request->search}%");
            });
        }

        if ($request->category && $request->category !== 'all') {
            $query->whereHas('slots', function ($q) use ($request) {
                $q->where('category', $request->category);
            });
        }

        $members = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json(['members' => $members]);
    }

    public function winners(Request $request)
    {
        $query = Draw::query();

        if ($request->category && $request->category !== 'all') {
            $query->where('category', $request->category);
        }
        if ($request->round) {
            $query->where('round', $request->round);
        }

        $winners = $query->orderBy('draw_date', 'desc')->paginate(20);

        return response()->json(['winners' => $winners]);
    }

    public function payments(Request $request)
    {
        $query = PaymentLog::with('user');

        if ($request->status && $request->status !== 'all') {
            $query->where('status', $request->status === 'paid' ? 'success' : 'failed');
        }

        $payments = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json(['payments' => $payments]);
    }

    public function runDraw(Request $request)
    {
        $request->validate(['category' => 'required|string|in:500,1000,2000,5000']);

        $slots = Slot::where('category', $request->category)
            ->where('status', 'active')
            ->where('has_won', false)
            ->get();

        if ($slots->isEmpty()) {
            return response()->json(['message' => 'No eligible slots'], 400);
        }

        $winner = $slots->random();
        $round = Draw::where('category', $request->category)->count() + 1;
        $dailyAmount = (int)$request->category;

        $draw = Draw::create([
            'spin_id' => 'SPIN-' . strtoupper(uniqid()),
            'round' => $round,
            'category' => $request->category,
            'winning_slot' => $winner->slot_number,
            'winner_name' => $winner->user->name,
            'net_payout' => $dailyAmount * $slots->count() * 0.9,
            'commission_amount' => $dailyAmount * $slots->count() * 0.1,
            'total_collected' => $dailyAmount * $slots->count(),
            'draw_date' => now(),
        ]);

        $winner->update(['has_won' => true]);

        return response()->json(['draw' => $draw]);
    }

    public function payout(Request $request)
    {
        $request->validate([
            'draw_id' => 'required|exists:draws,id',
            'password' => 'required|string',
        ]);

        $storedPin = Setting::where('key', 'admin_payout_pin')->value('value');
        $expectedPin = is_array($storedPin) ? ($storedPin['pin'] ?? env('ADMIN_PAYOUT_PIN', '123456')) : env('ADMIN_PAYOUT_PIN', '123456');

        if ($request->password !== $expectedPin) {
            return response()->json(['message' => 'Wrong password'], 422);
        }

        $draw = Draw::findOrFail($request->draw_id);

        PaymentLog::create([
            'user_id' => 1,
            'user_name' => $draw->winner_name,
            'amount' => $draw->net_payout,
            'status' => 'success',
            'payment_gateway' => 'Telebirr',
            'trans_ref' => 'PO-' . strtoupper(uniqid()),
        ]);

        return response()->json(['message' => 'Payout successful', 'draw' => $draw]);
    }

    public function updateSettings(Request $request)
    {
        $request->validate([
            'key' => 'required|string',
            'value' => 'required',
        ]);

        $setting = Setting::updateOrCreate(
            ['key' => $request->key],
            ['value' => $request->value]
        );

        return response()->json(['setting' => $setting]);
    }
}
