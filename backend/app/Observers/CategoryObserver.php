<?php

namespace App\Observers;

use App\Events\CategoryConfigurationChanged;
use App\Models\Category;
use App\Models\Round;
use Illuminate\Support\Facades\DB;

class CategoryObserver
{
    public function created(Category $category): void
    {
        DB::transaction(function () use ($category) {
            $this->syncCollateralRules($category);

            event(new CategoryConfigurationChanged($category, 'created'));
        });
    }

    public function updated(Category $category): void
    {
        $changed = $category->getDirty();

        $collateralFields = ['collateral_type', 'requires_license', 'license_type', 'penalty_clause'];
        $hasCollateralChange = !empty(array_intersect(array_keys($changed), $collateralFields));

        if (!$hasCollateralChange) {
            event(new CategoryConfigurationChanged($category, 'updated', array_keys($changed)));
            return;
        }

        DB::transaction(function () use ($category, $changed) {
            $this->syncCollateralRules($category);
            $this->syncAssociatedRounds($category);

            event(new CategoryConfigurationChanged($category, 'updated', array_keys($changed)));
        });
    }

    public function deleted(Category $category): void
    {
        DB::transaction(function () use ($category) {
            Round::where('category', $category->code)
                ->update(['status' => 'cancelled']);

            event(new CategoryConfigurationChanged($category, 'deleted'));
        });
    }

    private function syncCollateralRules(Category $category): void
    {
        $rules = [
            'requires_license' => $category->requires_license,
            'license_type' => $category->license_type,
            'collateral_type' => $category->collateral_type,
            'eligible_for_equb' => $category->is_active && $category->max_members > 0,
            'registration_requirements' => $this->buildRegistrationRequirements($category),
        ];

        $category->metadata = array_merge($category->metadata ?? [], [
            'collateral_rules' => $rules,
            'last_synced_at' => now()->toIso8601String(),
        ]);

        $category->saveQuietly();
    }

    private function buildRegistrationRequirements(Category $category): array
    {
        $requirements = [
            'min_deposit' => $category->min_deposit ?? 0,
            'max_members' => $category->max_members,
            'required_documents' => [],
        ];

        if ($category->requires_license) {
            $requirements['required_documents'][] = $category->license_type;
        }

        if ($category->collateral_type === 'trade_license') {
            $requirements['required_documents'][] = 'Trade License (የንግድ ፍቃድ)';
            $requirements['penalty_on_default'] = 'Trade License REVOCATION + Business prohibition';
        } elseif ($category->collateral_type === 'driving_license') {
            $requirements['required_documents'][] = 'Driving License (የመንጃ ፍቃድ)';
            $requirements['penalty_on_default'] = 'Driving License IMMEDIATE SUSPENSION';
        } elseif ($category->collateral_type === 'salary_withholding') {
            $requirements['required_documents'][] = 'Employer Letter (የአሰሪ ደብዳቤ)';
            $requirements['penalty_on_default'] = 'Full Monthly Salary GARNISHMENT';
        }

        return $requirements;
    }

    private function syncAssociatedRounds(Category $category): void
    {
        $rounds = Round::where('category', $category->code)
            ->where('status', '!=', 'completed')
            ->get();

        foreach ($rounds as $round) {
            $round->metadata = array_merge($round->metadata ?? [], [
                'category_updated_at' => now()->toIso8601String(),
                'collateral_type' => $category->collateral_type,
                'license_type' => $category->license_type,
            ]);
            $round->saveQuietly();
        }
    }
}
