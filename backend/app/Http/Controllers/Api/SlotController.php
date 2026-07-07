<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Slot;
use Illuminate\Http\Request;

class SlotController extends Controller
{
    public function index(Request $request)
    {
        $slots = $request->user()->slots;
        return response()->json(['slots' => $slots]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category' => 'required|string|in:500,1000,2000,5000,savings',
        ]);

        $count = Slot::where('user_id', $request->user()->id)
            ->where('category', $validated['category'])
            ->count();

        $slot = Slot::create([
            'user_id' => $request->user()->id,
            'category' => $validated['category'],
            'slot_number' => $count + 1,
            'registration_date' => now()->toDateString(),
        ]);

        return response()->json(['slot' => $slot], 201);
    }
}
