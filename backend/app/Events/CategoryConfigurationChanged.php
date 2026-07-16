<?php

namespace App\Events;

use App\Models\Category;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CategoryConfigurationChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

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

    public function broadcastOn(): array
    {
        return [
            new Channel('equb.categories'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'category.configuration.changed';
    }
}
