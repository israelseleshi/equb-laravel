<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SlotController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\DrawController;
use App\Http\Controllers\Api\SavingsController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\RoundController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\PromoController;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

// Public data
Route::get('/tiers', [DrawController::class, 'tiers']);
Route::get('/draws/recent', [DrawController::class, 'recent']);
Route::get('/draws/{category}', [DrawController::class, 'byCategory']);

// Public round data
Route::get('/rounds', [RoundController::class, 'index']);
Route::get('/rounds/stats', [RoundController::class, 'roundStats']);
Route::get('/rounds/{id}', [RoundController::class, 'show'])->where('id', '[0-9]+');
Route::put('/rounds/{id}', [RoundController::class, 'update'])->where('id', '[0-9]+');
Route::delete('/rounds/{id}', [RoundController::class, 'destroy'])->where('id', '[0-9]+');
Route::post('/rounds/{id}/activate', [RoundController::class, 'activate'])->where('id', '[0-9]+');
Route::post('/rounds/{id}/demo-fill', [RoundController::class, 'demoFill'])->where('id', '[0-9]+');
Route::post('/rounds/{id}/complete', [RoundController::class, 'complete'])->where('id', '[0-9]+');
Route::post('/rounds/{id}/cancel', [RoundController::class, 'cancel'])->where('id', '[0-9]+');
Route::post('/rounds/{id}/spin', [RoundController::class, 'manualSpin'])->where('id', '[0-9]+');
Route::post('/rounds', [RoundController::class, 'store']);

// Public category data
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{id}', [CategoryController::class, 'show']);

// Public promo code validation
Route::post('/promo/validate', [PromoController::class, 'validateCode']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);

    // Slots
    Route::get('/slots', [SlotController::class, 'index']);
    Route::post('/slots', [SlotController::class, 'store']);

    // Payments
    Route::get('/payments/{slotId}', [PaymentController::class, 'index']);
    Route::post('/payments/pay', [PaymentController::class, 'payDay']);
    Route::post('/payments/pay-multiple', [PaymentController::class, 'payMultiple']);
    Route::get('/payments/receipt/{paymentId}', [PaymentController::class, 'receipt']);

    // Member self-enroll into a round
    Route::post('/rounds/{id}/enroll', [RoundController::class, 'enroll'])->where('id', '[0-9]+');

        // Draws
        Route::post('/draws/spin', [DrawController::class, 'spin']);

        // Ludo Dice Shaker draw engine
        Route::post('/draw/shake', [DrawController::class, 'shake']);

    // Savings
    Route::get('/savings/{slotId}', [SavingsController::class, 'index']);
    Route::post('/savings/deposit', [SavingsController::class, 'deposit']);
    Route::post('/savings/withdraw', [SavingsController::class, 'withdraw']);
    Route::get('/savings/statement/{slotId}', [SavingsController::class, 'statement']);

    // Admin routes
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/stats', [AdminController::class, 'stats']);
        Route::get('/members', [AdminController::class, 'members']);
        Route::get('/winners', [AdminController::class, 'winners']);
        Route::get('/payments', [AdminController::class, 'payments']);
        Route::post('/draw', [AdminController::class, 'runDraw']);
        Route::post('/draw/shake', [DrawController::class, 'shake']);
        Route::post('/payout', [AdminController::class, 'payout']);
        Route::post('/settings', [AdminController::class, 'updateSettings']);

        // Round management
        Route::get('/rounds', [RoundController::class, 'index']);
        Route::get('/rounds/stats', [RoundController::class, 'roundStats']);
        Route::post('/rounds', [RoundController::class, 'store']);
        Route::put('/rounds/{id}', [RoundController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/rounds/{id}', [RoundController::class, 'destroy'])->where('id', '[0-9]+');
        Route::post('/rounds/{id}/activate', [RoundController::class, 'activate'])->where('id', '[0-9]+');
        Route::post('/rounds/{id}/demo-fill', [RoundController::class, 'demoFill'])->where('id', '[0-9]+');
        Route::post('/rounds/{id}/complete', [RoundController::class, 'complete'])->where('id', '[0-9]+');
        Route::post('/rounds/{id}/cancel', [RoundController::class, 'cancel'])->where('id', '[0-9]+');
        Route::post('/rounds/{id}/enroll', [RoundController::class, 'enroll'])->where('id', '[0-9]+');
        Route::post('/rounds/{id}/unenroll', [RoundController::class, 'unenroll'])->where('id', '[0-9]+');
        Route::post('/rounds/{id}/spin', [RoundController::class, 'manualSpin'])->where('id', '[0-9]+');

        // Category management (Brain & Nerve Command Center)
        Route::get('/categories', [CategoryController::class, 'index']);
        Route::get('/categories/{id}', [CategoryController::class, 'show']);
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{id}', [CategoryController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/categories/{id}', [CategoryController::class, 'destroy'])->where('id', '[0-9]+');
        Route::post('/categories/{id}/cascade', [CategoryController::class, 'cascadeUpdate'])->where('id', '[0-9]+');

        // Promo / Broker management
        Route::get('/promos', [PromoController::class, 'index']);
        Route::get('/promos/stats', [PromoController::class, 'stats']);
        Route::get('/promos/{id}', [PromoController::class, 'show']);
        Route::post('/promos', [PromoController::class, 'store']);
        Route::put('/promos/{id}', [PromoController::class, 'update']);
        Route::delete('/promos/{id}', [PromoController::class, 'destroy']);
    });
});
