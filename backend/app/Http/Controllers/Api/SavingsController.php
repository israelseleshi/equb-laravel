<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SavingsTransaction;
use App\Models\Slot;
use Illuminate\Http\Request;

class SavingsController extends Controller
{
    public function index(Request $request, $slotId)
    {
        $slot = Slot::where('id', $slotId)->where('user_id', $request->user()->id)->firstOrFail();

        $deposits = SavingsTransaction::where('slot_id', $slotId)
            ->where('type', 'deposit')
            ->orderBy('created_at', 'desc')
            ->get();

        $withdrawals = SavingsTransaction::where('slot_id', $slotId)
            ->where('type', 'withdrawal')
            ->orderBy('created_at', 'desc')
            ->get();

        $balance = $deposits->sum('amount') - $withdrawals->sum('amount');
        $totalDeposits = $deposits->sum('amount');
        $totalWithdrawn = $withdrawals->sum('amount');

        return response()->json([
            'balance' => $balance,
            'total_deposits' => $totalDeposits,
            'total_withdrawn' => $totalWithdrawn,
            'deposits' => $deposits,
            'withdrawals' => $withdrawals,
        ]);
    }

    public function deposit(Request $request)
    {
        $request->validate([
            'slot_id' => 'required|exists:slots,id',
            'amount' => 'required|numeric|min:10',
        ]);

        $slot = Slot::where('id', $request->slot_id)->where('user_id', $request->user()->id)->firstOrFail();

        $transaction = SavingsTransaction::create([
            'user_id' => $request->user()->id,
            'slot_id' => $request->slot_id,
            'type' => 'deposit',
            'amount' => $request->amount,
            'commission' => 0,
            'net_amount' => $request->amount,
            'trans_ref' => 'DEP-' . strtoupper(uniqid()),
            'method' => 'USSD',
        ]);

        return response()->json(['transaction' => $transaction], 201);
    }

    public function withdraw(Request $request)
    {
        $request->validate([
            'slot_id' => 'required|exists:slots,id',
        ]);

        $slot = Slot::where('id', $request->slot_id)->where('user_id', $request->user()->id)->firstOrFail();

        $deposits = SavingsTransaction::where('slot_id', $request->slot_id)
            ->where('type', 'deposit')->sum('amount');
        $withdrawals = SavingsTransaction::where('slot_id', $request->slot_id)
            ->where('type', 'withdrawal')->sum('amount');
        $balance = $deposits - $withdrawals;

        if ($balance < 100) {
            return response()->json([
                'success' => false,
                'error' => 'Insufficient balance. Minimum withdrawal is 100 ETB.',
            ], 400);
        }

        $maxWithdrawal = $balance * 0.8;
        $amount = min($maxWithdrawal, $balance);
        $commission = round($amount * 0.02);
        $netAmount = $amount - $commission;

        $transaction = SavingsTransaction::create([
            'user_id' => $request->user()->id,
            'slot_id' => $request->slot_id,
            'type' => 'withdrawal',
            'amount' => $amount,
            'commission' => $commission,
            'net_amount' => $netAmount,
            'trans_ref' => 'WTH-' . strtoupper(uniqid()),
            'method' => 'USSD',
        ]);

        return response()->json([
            'success' => true,
            'transaction' => $transaction,
            'commission' => $commission,
            'net_amount' => $netAmount,
        ]);
    }

    public function statement(Request $request, $slotId)
    {
        $slot = Slot::where('id', $slotId)->where('user_id', $request->user()->id)->firstOrFail();

        $transactions = SavingsTransaction::where('slot_id', $slotId)
            ->orderBy('created_at')
            ->get();

        return response()->json(['transactions' => $transactions]);
    }
}
