<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Slot;
use App\Models\PromoCode;
use App\Services\SmsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20|unique:users',
            'email' => 'nullable|email|max:255',
            'password' => 'required|string|min:6',
            'fayda_id' => 'nullable|string|max:20',
            'work_address' => 'nullable|string|max:255',
            'category' => 'required|string|in:500,1000,2000,5000,savings',
            'promo_code' => 'nullable|string|max:20|exists:promo_codes,code',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'email' => $validated['email'] ?? null,
            'password' => Hash::make($validated['password']),
            'fayda_id' => $validated['fayda_id'] ?? null,
            'work_address' => $validated['work_address'] ?? null,
            'promo_code' => $validated['promo_code'] ?? null,
            'role' => 'member',
            'status' => 'active',
            'registration_date' => now()->toDateString(),
        ]);

        // Auto-credit broker commission if promo code used
        if (!empty($validated['promo_code'])) {
            $promo = PromoCode::where('code', $validated['promo_code'])->first();
            if ($promo && $promo->isActive()) {
                $commissionBase = (int) $validated['category'];
                $promo->incrementRegistrations($commissionBase);
            }
        }

        $slots = Slot::where('category', $validated['category'])->count();
        $slot = Slot::create([
            'user_id' => $user->id,
            'category' => $validated['category'],
            'slot_number' => $slots + 1,
            'registration_date' => now()->toDateString(),
        ]);

        $token = $user->createToken('equb-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'slot' => $slot,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('phone', $request->phone)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'error' => 'Invalid phone or password',
            ], 401);
        }

        $token = $user->createToken('equb-token')->plainTextToken;
        $slots = $user->slots;

        return response()->json([
            'success' => true,
            'user' => $user,
            'slots' => $slots,
            'role' => $user->role,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('slots');
        return response()->json([
            'user' => $user,
            'slots' => $user->slots,
            'role' => $user->role,
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|nullable|email|max:255',
            'work_address' => 'sometimes|nullable|string|max:255',
        ]);

        $user->update($validated);

        return response()->json(['user' => $user]);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate(['phone' => 'required|string']);

        $user = User::where('phone', $request->phone)->first();
        if (!$user) {
            return response()->json(['message' => 'If this phone exists, a reset code was sent'], 200);
        }

        $otp = (string) random_int(100000, 999999);

        Cache::put("otp_{$request->phone}", [
            'otp' => $otp,
            'expires_at' => now()->addMinutes(10),
        ], 600);

        $sms = new SmsService;
        $sms->sendOtp($request->phone, $otp);

        return response()->json(['message' => 'Reset code sent to your phone']);
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'otp' => 'required|string|size:6',
        ]);

        $stored = Cache::get("otp_{$request->phone}");

        if (!$stored || $stored['otp'] !== $request->otp) {
            return response()->json(['message' => 'Invalid or expired code'], 422);
        }

        if (now()->greaterThan($stored['expires_at'])) {
            Cache::forget("otp_{$request->phone}");
            return response()->json(['message' => 'Code expired, request a new one'], 422);
        }

        Cache::forget("otp_{$request->phone}");

        $resetToken = bin2hex(random_bytes(32));
        Cache::put("reset_token_{$request->phone}", $resetToken, 300);

        return response()->json([
            'message' => 'OTP verified',
            'reset_token' => $resetToken,
        ]);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
            'reset_token' => 'required|string',
        ]);

        $storedToken = Cache::get("reset_token_{$request->phone}");
        if (!$storedToken || $storedToken !== $request->reset_token) {
            return response()->json(['message' => 'Invalid or expired reset token'], 422);
        }

        $user = User::where('phone', $request->phone)->first();
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $user->password = Hash::make($request->password);
        $user->save();

        Cache::forget("reset_token_{$request->phone}");

        return response()->json(['message' => 'Password reset successfully']);
    }

}
