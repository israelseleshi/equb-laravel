<?php

namespace App\Events;

use App\Models\Category;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;

class CategoryConfigurationChanged
{
    use Dispatchable, InteractsWithSockets;

    public Category $category;

    public string $action;

    public array $changedFields;

    public array $snapshot;

    public function __construct(Category $category, string $action, array $changedFields = [])
    {
        $this->category = $category;
        $this->action = $action;
        $this->changedFields = $changedFields;
        $this->snapshot = $category->toArray();
    }
}
