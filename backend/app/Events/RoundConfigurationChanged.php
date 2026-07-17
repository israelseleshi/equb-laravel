<?php

namespace App\Events;

use App\Models\Round;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;

class RoundConfigurationChanged
{
    use Dispatchable, InteractsWithSockets;

    public Round $round;

    public string $action;

    public array $changedFields;

    public array $snapshot;

    public function __construct(Round $round, string $action, array $changedFields = [])
    {
        $this->round = $round;
        $this->action = $action;
        $this->changedFields = $changedFields;
        $this->snapshot = $round->toArray();
    }
}
