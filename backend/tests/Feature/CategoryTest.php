<?php

use App\Models\Category;

/* ───────────────────────────────────────────
   1. List categories (public)
   ─────────────────────────────────────────── */
test('anyone can list categories', function () {
    Category::factory()->count(3)->create();

    $response = $this->getJson('/api/categories');

    $response->assertStatus(200)
        ->assertJsonStructure(['categories'])
        ->assertJsonCount(3, 'categories');
});

/* ───────────────────────────────────────────
   2. Show category with stats
   ─────────────────────────────────────────── */
test('anyone can view a specific category', function () {
    $category = createTestCategory('500');

    $response = $this->getJson("/api/categories/{$category->id}");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'category' => ['id', 'code', 'label_en'],
            'stats' => ['active_slots', 'total_balance', 'max_members', 'registration_open'],
        ]);
});

/* ───────────────────────────────────────────
   3. Admin can create category
   ─────────────────────────────────────────── */
test('admin can create a category', function () {
    $response = adminPost('/admin/categories', [
        'code' => '3000',
        'label_en' => '3000 ETB',
        'label_am' => '3000 ብር',
        'amount' => 3000,
        'frequency' => 'daily',
        'max_members' => 20,
        'total_rounds' => 30,
        'collateral_type' => 'none',
    ]);

    $response->assertStatus(201)
        ->assertJsonStructure(['category']);
});

/* ───────────────────────────────────────────
   4. Admin can update category
   ─────────────────────────────────────────── */
test('admin can update a category', function () {
    $category = createTestCategory('500');

    $response = adminPut("/admin/categories/{$category->id}", [
        'label_en' => 'Updated Label',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('category.label_en', 'Updated Label');
});

/* ───────────────────────────────────────────
   5. Admin can delete category with no active rounds
   ─────────────────────────────────────────── */
test('admin can delete a category with no active rounds', function () {
    $category = createTestCategory('999');
    $admin = createAdmin();

    $response = $this->withToken($admin['token'])
        ->deleteJson("/api/admin/categories/{$category->id}");

    $response->assertStatus(200)
        ->assertJson(['message' => 'Category deleted']);

    $this->assertModelMissing($category);
});

/* ───────────────────────────────────────────
   6. Cannot delete category with active rounds
   ─────────────────────────────────────────── */
test('admin cannot delete a category with active rounds', function () {
    $category = createTestCategory('500');
    \App\Models\Round::factory()->active()->create([
        'category' => '500',
    ]);

    $response = adminDelete("/admin/categories/{$category->id}");

    $response->assertStatus(422);
});

/* ───────────────────────────────────────────
   7. Cascade update category to rounds
   ─────────────────────────────────────────── */
test('admin can cascade update category to rounds', function () {
    $category = createTestCategory('500');
    $round = \App\Models\Round::factory()->active()->create([
        'category' => '500',
        'amount' => 500,
    ]);

    $response = adminPost("/admin/categories/{$category->id}/cascade", [
        'amount' => 600,
        'max_members' => 30,
        'propagate_to_rounds' => true,
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('propagated_to_rounds', true);

    $this->assertEquals(600, $round->fresh()->amount);
});
