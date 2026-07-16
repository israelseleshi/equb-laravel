<?php

namespace App\Providers;

use App\Events\RoundConfigurationChanged;
use App\Events\CategoryConfigurationChanged;
use App\Listeners\RecalculatePoolOnRoundChange;
use App\Listeners\UpdateRegistrationRulesOnCategoryChange;
use App\Observers\RoundObserver;
use App\Observers\CategoryObserver;
use App\Models\Round;
use App\Models\Category;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    protected $listen = [
        RoundConfigurationChanged::class => [
            RecalculatePoolOnRoundChange::class,
        ],
        CategoryConfigurationChanged::class => [
            UpdateRegistrationRulesOnCategoryChange::class,
        ],
    ];

    public function boot(): void
    {
        Round::observe(RoundObserver::class);
        Category::observe(CategoryObserver::class);
    }
}
