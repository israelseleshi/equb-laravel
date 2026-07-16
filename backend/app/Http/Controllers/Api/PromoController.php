<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PromoCode;
use App\Models\User;
use Illuminate\Http\Request;

class PromoController extends Controller
{
    public function index()
    {
        $promos = PromoCode::orderBy('created_at', 'desc')->get();

        return response()->json([
            'promo_codes' => $promos,
        ]);
    }

    public function show($id)
    {
        $promo = PromoCode::with('users')->findOrFail($id);

        $recentRegistrations = User::where('promo_code', $promo->code)
            ->orderBy('created_at', 'desc')
            ->take(20)
            ->get(['id', 'name', 'phone', 'created_at']);

        return response()->json([
            'promo_code' => $promo,
            'recent_registrations' => $recentRegistrations,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'broker_name' => 'required|string|max:255',
            'broker_phone' => 'required|string|max:20',
            'commission_rate' => 'nullable|numeric|min:0.5|max:50',
        ]);

        $code = 'PROMO-' . strtoupper(substr(md5(uniqid()), 0, 8));

        $promo = PromoCode::create([
            'code' => $code,
            'broker_name' => $validated['broker_name'],
            'broker_phone' => $validated['broker_phone'],
            'commission_rate' => $validated['commission_rate'] ?? 2.00,
            'total_registrations' => 0,
            'total_earned' => 0,
            'status' => 'active',
        ]);

        return response()->json(['promo_code' => $promo], 201);
    }

    public function update(Request $request, $id)
    {
        $promo = PromoCode::findOrFail($id);

        $validated = $request->validate([
            'broker_name' => 'sometimes|string|max:255',
            'broker_phone' => 'sometimes|string|max:20',
            'commission_rate' => 'sometimes|numeric|min:0.5|max:50',
            'status' => 'sometimes|in:active,inactive',
        ]);

        $promo->update($validated);

        return response()->json(['promo_code' => $promo]);
    }

    public function destroy($id)
    {
        $promo = PromoCode::findOrFail($id);

        User::where('promo_code', $promo->code)->update(['promo_code' => null]);
        $promo->delete();

        return response()->json(['message' => 'Promo code deleted']);
    }

    public function validateCode(Request $request)
    {
        $request->validate(['code' => 'required|string|max:20']);

        $promo = PromoCode::where('code', $request->code)
            ->where('status', 'active')
            ->first();

        if (!$promo) {
            return response()->json([
                'valid' => false,
                'message' => 'Invalid or inactive promo code',
            ]);
        }

        return response()->json([
            'valid' => true,
            'promo_code' => $promo,
        ]);
    }

    public function stats()
    {
        $totalBrokers = PromoCode::count();
        $activeBrokers = PromoCode::where('status', 'active')->count();
        $totalRegistrations = PromoCode::sum('total_registrations');
        $totalPaidOut = PromoCode::sum('total_earned');
        $registrationsToday = User::whereDate('created_at', now()->toDateString())
            ->whereNotNull('promo_code')
            ->count();

        return response()->json([
            'total_brokers' => $totalBrokers,
            'active_brokers' => $activeBrokers,
            'total_registrations' => $totalRegistrations,
            'total_paid_out' => $totalPaidOut,
            'registrations_today' => $registrationsToday,
        ]);
    }
}
