<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\PaymentLog;
use App\Models\Slot;
use App\Models\Setting;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request, $slotId)
    {
        $slot = Slot::where('id', $slotId)->where('user_id', $request->user()->id)->firstOrFail();
        $payments = Payment::where('slot_id', $slotId)->orderBy('date')->get();
        return response()->json(['payments' => $payments, 'slot' => $slot]);
    }

    public function payDay(Request $request)
    {
        $request->validate([
            'slot_id' => 'required|exists:slots,id',
            'day_index' => 'required|integer',
        ]);

        $payment = Payment::where('slot_id', $request->slot_id)
            ->where('day_index', $request->day_index)
            ->firstOrFail();

        $payment->update([
            'status' => 'paid',
            'trans_ref' => 'TXN' . strtoupper(uniqid()),
            'method' => 'USSD',
        ]);

        PaymentLog::create([
            'user_id' => $request->user()->id,
            'user_name' => $request->user()->name,
            'amount' => $payment->amount,
            'status' => 'success',
            'payment_gateway' => 'Telebirr',
            'trans_ref' => $payment->trans_ref,
        ]);

        return response()->json(['payment' => $payment]);
    }

    public function payMultiple(Request $request)
    {
        $request->validate([
            'slot_id' => 'required|exists:slots,id',
            'day_indices' => 'required|array',
            'day_indices.*' => 'integer',
        ]);

        $updated = [];
        foreach ($request->day_indices as $dayIndex) {
            $payment = Payment::where('slot_id', $request->slot_id)
                ->where('day_index', $dayIndex)
                ->first();

            if ($payment && $payment->status === 'unpaid') {
                $payment->update([
                    'status' => 'paid',
                    'trans_ref' => 'TXN' . strtoupper(uniqid()),
                    'method' => 'USSD',
                ]);
                $updated[] = $payment;
            }
        }

        return response()->json(['payments' => $updated]);
    }

    public function receipt(Request $request, $paymentId)
    {
        $payment = Payment::with('slot', 'user')->findOrFail($paymentId);

        if ($payment->user_id !== $request->user()->id && $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json(['payment' => $payment]);
    }
}
