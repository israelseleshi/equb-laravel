<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Round;
use App\Models\Slot;
use App\Events\CategoryConfigurationChanged;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::orderBy('sort_order')->orderBy('code')->get();

        return response()->json([
            'categories' => $categories,
        ]);
    }

    public function show($id)
    {
        $category = Category::with('rounds')->findOrFail($id);

        $activeSlots = Slot::where('category', $category->code)->where('status', 'active')->count();
        $totalBalance = Slot::where('category', $category->code)->sum('balance');

        return response()->json([
            'category' => $category,
            'stats' => [
                'active_slots' => $activeSlots,
                'total_balance' => $totalBalance,
                'max_members' => $category->max_members,
                'registration_open' => $category->isRegistrationOpen(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:20|unique:categories,code',
            'label_en' => 'required|string|max:255',
            'label_am' => 'required|string|max:255',
            'amount' => 'required|numeric|min:1',
            'frequency' => 'required|in:daily,weekly,monthly',
            'max_members' => 'required|integer|min:1|max:500',
            'min_deposit' => 'nullable|numeric|min:0',
            'total_rounds' => 'required|integer|min:1|max:365',
            'collateral_type' => 'nullable|string|in:trade_license,driving_license,salary_withholding,none',
            'license_type' => 'nullable|string|max:255',
            'requires_license' => 'nullable|boolean',
            'penalty_clause_en' => 'nullable|string',
            'penalty_clause_am' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $category = DB::transaction(function () use ($validated) {
            $category = Category::create([
                'code' => $validated['code'],
                'label_en' => $validated['label_en'],
                'label_am' => $validated['label_am'],
                'amount' => $validated['amount'],
                'frequency' => $validated['frequency'],
                'max_members' => $validated['max_members'],
                'min_deposit' => $validated['min_deposit'] ?? 0,
                'total_rounds' => $validated['total_rounds'],
                'collateral_type' => $validated['collateral_type'] ?? 'none',
                'license_type' => $validated['license_type'] ?? null,
                'requires_license' => $validated['requires_license'] ?? false,
                'penalty_clause_en' => $validated['penalty_clause_en'] ?? null,
                'penalty_clause_am' => $validated['penalty_clause_am'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'sort_order' => $validated['sort_order'] ?? 0,
                'metadata' => [
                    'created_via' => 'admin_panel',
                    'original_code' => $validated['code'],
                ],
            ]);

            event(new CategoryConfigurationChanged($category, 'created'));

            return $category;
        });

        return response()->json(['category' => $category], 201);
    }

    public function update(Request $request, $id)
    {
        $category = Category::findOrFail($id);

        $validated = $request->validate([
            'label_en' => 'sometimes|string|max:255',
            'label_am' => 'sometimes|string|max:255',
            'amount' => 'sometimes|numeric|min:1',
            'frequency' => 'sometimes|in:daily,weekly,monthly',
            'max_members' => 'sometimes|integer|min:1|max:500',
            'min_deposit' => 'nullable|numeric|min:0',
            'total_rounds' => 'sometimes|integer|min:1|max:365',
            'collateral_type' => 'nullable|string|in:trade_license,driving_license,salary_withholding,none',
            'license_type' => 'nullable|string|max:255',
            'requires_license' => 'nullable|boolean',
            'penalty_clause_en' => 'nullable|string',
            'penalty_clause_am' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $category = DB::transaction(function () use ($category, $validated) {
            $category->update($validated);
            $category->refresh();

            event(new CategoryConfigurationChanged($category, 'updated', array_keys($validated)));

            return $category;
        });

        return response()->json(['category' => $category]);
    }

    public function destroy($id)
    {
        $category = Category::findOrFail($id);

        $activeRounds = Round::where('category', $category->code)
            ->whereIn('status', ['active', 'draft'])
            ->count();

        if ($activeRounds > 0) {
            return response()->json([
                'message' => "Cannot delete category. {$activeRounds} round(s) still active. Cancel them first.",
            ], 422);
        }

        DB::transaction(function () use ($category) {
            event(new CategoryConfigurationChanged($category, 'deleted'));
            $category->delete();
        });

        return response()->json(['message' => 'Category deleted']);
    }

    public function cascadeUpdate(Request $request, $id)
    {
        $category = Category::with('rounds')->findOrFail($id);

        $validated = $request->validate([
            'amount' => 'sometimes|numeric|min:1',
            'max_members' => 'sometimes|integer|min:1|max:500',
            'collateral_type' => 'nullable|string',
            'license_type' => 'nullable|string',
            'requires_license' => 'nullable|boolean',
            'propagate_to_rounds' => 'nullable|boolean',
        ]);

        $category = DB::transaction(function () use ($category, $validated) {
            $category->update($validated);

            if (!empty($validated['propagate_to_rounds'])) {
                $activeRounds = Round::where('category', $category->code)
                    ->whereIn('status', ['active', 'draft'])
                    ->get();

                foreach ($activeRounds as $round) {
                    if (isset($validated['amount'])) {
                        $round->amount = $validated['amount'];
                    }
                    if (isset($validated['max_members'])) {
                        $round->people_goal = $validated['max_members'];
                    }
                    $round->save();
                }
            }

            event(new CategoryConfigurationChanged($category, 'cascade_update', array_keys($validated)));

            return $category->fresh();
        });

        return response()->json([
            'category' => $category,
            'propagated_to_rounds' => !empty($validated['propagate_to_rounds']),
            'message' => 'Category updated and cascaded to all active rounds.',
        ]);
    }
}
