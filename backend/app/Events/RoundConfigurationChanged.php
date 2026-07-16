<?php

namespace App\Events;

use App\Models\Round;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RoundConfigurationChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

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

    public function broadcastOn(): array
    {
        return [
            new Channel('equb.rounds'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'round.configuration.changed';
    }
}
