<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Category;
use App\Models\Round;
use App\Models\Slot;
use App\Models\Payment;
use App\Models\Draw;
use App\Models\PromoCode;
use App\Models\PaymentLog;
use App\Models\SavingsTransaction;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to the
| specific TestCase class. If you need to apply a custom trait, use
| the `uses()` call in a specific test file or across the whole test suite.
|
*/

uses(
    Tests\TestCase::class,
    RefreshDatabase::class
)->in('Feature', 'Unit');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet
| certain conditions. The `expect()` function gives you access to a
| set of "expectations" methods that you can use to assert different
| things. Under the hood, they're powered by PHPUnit assertions.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing
| code specific to your project that you don't want to repeat in every
| file. Here you can also expose helpers as global functions to help you
| reduce the number of lines of code in your test files.
|
*/

/**
 * Create an admin user and return it with a Sanctum token.
 */
function createAdmin(array $overrides = []): array
{
    $user = User::factory()->admin()->create($overrides);
    $token = $user->createToken('test-token')->plainTextToken;
    return ['user' => $user, 'token' => $token];
}

/**
 * Create a regular member user and return it with a Sanctum token.
 */
function createMember(array $overrides = []): array
{
    $user = User::factory()->member()->create($overrides);
    $token = $user->createToken('test-token')->plainTextToken;
    return ['user' => $user, 'token' => $token];
}

/**
 * Helper to make authenticated API calls as admin.
 */
function adminGet(string $uri, array $headers = []): \Illuminate\Testing\TestResponse
{
    $admin = createAdmin();
    return test()->withToken($admin['token'])
        ->getJson('/api' . $uri, $headers);
}

function adminPost(string $uri, array $data = []): \Illuminate\Testing\TestResponse
{
    $admin = createAdmin();
    return test()->withToken($admin['token'])
        ->postJson('/api' . $uri, $data);
}

function adminPut(string $uri, array $data = []): \Illuminate\Testing\TestResponse
{
    $admin = createAdmin();
    return test()->withToken($admin['token'])
        ->putJson('/api' . $uri, $data);
}

function adminDelete(string $uri): \Illuminate\Testing\TestResponse
{
    $admin = createAdmin();
    return test()->withToken($admin['token'])
        ->deleteJson('/api' . $uri);
}

/**
 * Helper to make authenticated API calls as a regular member.
 */
function memberGet(string $uri, array $headers = []): \Illuminate\Testing\TestResponse
{
    $member = createMember();
    return test()->withToken($member['token'])
        ->getJson('/api' . $uri, $headers);
}

function memberPost(string $uri, array $data = []): \Illuminate\Testing\TestResponse
{
    $member = createMember();
    return test()->withToken($member['token'])
        ->postJson('/api' . $uri, $data);
}

function memberPut(string $uri, array $data = []): \Illuminate\Testing\TestResponse
{
    $member = createMember();
    return test()->withToken($member['token'])
        ->putJson('/api' . $uri, $data);
}

function memberDelete(string $uri): \Illuminate\Testing\TestResponse
{
    $member = createMember();
    return test()->withToken($member['token'])
        ->deleteJson('/api' . $uri);
}

/**
 * Create a complete round with slots and payments.
 */
function createRoundWithSlots(string $category = '500', string $status = 'active'): Round
{
    $round = Round::factory()->create([
        'category' => $category,
        'amount' => (int)$category,
        'frequency' => 'daily',
        'people_goal' => 5,
        'total_rounds' => 5,
        'status' => $status,
    ]);

    for ($i = 0; $i < 5; $i++) {
        $user = User::factory()->member()->create([
            'phone' => '0910000' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
        ]);
        $slot = Slot::factory()->create([
            'user_id' => $user->id,
            'round_id' => $round->id,
            'category' => $category,
            'slot_number' => $i + 1,
            'status' => 'active',
        ]);
        $round->incrementParticipants();
    }

    return $round->fresh();
}

/**
 * Create a category for testing.
 */
function createTestCategory(string $code = '100', array $overrides = []): Category
{
    return Category::factory()->create(array_merge([
        'code' => $code,
        'label_en' => "{$code} ETB",
        'label_am' => "{$code} ብር",
        'amount' => (int)$code,
        'is_active' => true,
    ], $overrides));
}
