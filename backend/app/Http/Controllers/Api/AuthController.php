<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Slot;
use Illuminate\Http\Request;
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
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'email' => $validated['email'] ?? null,
            'password' => Hash::make($validated['password']),
            'fayda_id' => $validated['fayda_id'] ?? null,
            'work_address' => $validated['work_address'] ?? null,
            'role' => 'member',
            'status' => 'active',
            'registration_date' => now()->toDateString(),
        ]);

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

        // In production, send SMS via 3rd party. For now, return a mock OTP.
        $otp = '4921';

        return response()->json([
            'message' => 'Reset code sent to your phone',
            'otp' => $otp,
        ]);
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'otp' => 'required|string|size:4',
        ]);

        // In production, verify against stored OTP.
        if ($request->otp !== '4921') {
            return response()->json(['message' => 'Invalid code'], 422);
        }

        // Generate a reset token
        $resetToken = bin2hex(random_bytes(32));

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

        $user = User::where('phone', $request->phone)->first();
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $user->password = Hash::make($request->password);
        $user->save();

        return response()->json(['message' => 'Password reset successfully']);
    }
}
