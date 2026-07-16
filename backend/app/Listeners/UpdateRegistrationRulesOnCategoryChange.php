<?php

namespace App\Listeners;

use App\Events\CategoryConfigurationChanged;
use Illuminate\Support\Facades\Cache;

class UpdateRegistrationRulesOnCategoryChange
{
    public function handle(CategoryConfigurationChanged $event): void
    {
        $category = $event->category;

        $rules = [
            'code' => $category->code,
            'label_en' => $category->label_en,
            'label_am' => $category->label_am,
            'amount' => $category->amount,
            'is_active' => $category->is_active,
            'max_members' => $category->max_members,
            'collateral_type' => $category->collateral_type,
            'license_type' => $category->license_type,
            'requires_license' => $category->requires_license,
            'registration_requirements' => $category->metadata['collateral_rules']['registration_requirements'] ?? [],
            'event_action' => $event->action,
            'last_updated' => now()->toIso8601String(),
        ];

        Cache::put("category_rules_{$category->code}", $rules, 3600);

        Cache::forget('categories_all');
    }
}
