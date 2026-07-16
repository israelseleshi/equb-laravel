# Table Creation Plan — `charisme_equb` on cPanel

**Source:** 19 existing Laravel migrations in `backend/database/migrations/`
**Target:** MariaDB 10.11.18 on cPanel (host: localhost, database: charisme_equb)
**Method:** phpMyAdmin SQL import (SSH blocked)

---

## Phase 1: Fix Migration Compatibility Issues

Before deploying, we must fix MariaDB-incompatible migrations. Laravel's Schema builder works differently on SQLite vs MariaDB in several places.

### Issue 1: ALTER ENUM in `rounds` table

**File:** `2026_07_15_000002_add_two_month_to_round_frequency.php` (line 12)

```php
$table->enum('frequency', ['daily', 'weekly', 'monthly', '2_month'])->default('daily')->change();
```

**Problem:** MariaDB does NOT support `ALTER TABLE ... MODIFY COLUMN ... ENUM(...)` through Laravel's `->change()` on enum columns. This will throw an error.

**Fix:** Replace this migration with a raw DB statement approach that drops the column and recreates it, or rebuilds the table.

### Issue 2: InnoDB Engine

Laravel's default migration uses MyISAM on some MariaDB configs. We need to ensure all tables use InnoDB for FK support.

**Fix:** Add `$table->engine('InnoDB')` to all `Schema::create()` calls.

### Issue 3: Timestamp Defaults

MariaDB is stricter about timestamp defaults than SQLite.

**Fix:** Ensure nullable timestamps use `->nullable()` explicitly.

### Issue 4: JSON Column Support

MariaDB 10.11 supports JSON natively, so `$table->json('metadata')->nullable()` is fine — no changes needed.

### Issue 5: Foreign Key Naming

MariaDB has a 64-character limit on identifier names. Laravel's auto-generated FK names can exceed this on long table/column names.

**Fix:** Add explicit `->constrained('table_name')->cascadeOnDelete()` with proper naming, or use `->foreignId(...)` with short column names.

---

## Phase 2: Create Database User in cPanel

| Step | Action | Details |
|------|--------|---------|
| 2.1 | Log into cPanel | Via browser or API |
| 2.2 | Go to MySQL Databases | |
| 2.3 | Create user | Username: `charisme_equb_user` (or new name), Strong password |
| 2.4 | Assign user to `charisme_equb` | Select ALL PRIVILEGES |
| 2.5 | Note credentials | Save for .env |

- [ ] Create database user in cPanel
- [ ] Assign user to charisme_equb with all privileges
- [ ] Save credentials for .env

---

## Phase 3: Update Backend `.env` for MariaDB

**Current SQLite config:**
```
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
```

**Target MariaDB config:**
```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=charisme_equb
DB_USERNAME=charisme_equb_user
DB_PASSWORD=<password_from_step_2>
```

Also add:
```
CACHE_DRIVER=database
QUEUE_CONNECTION=database
```

- [ ] Update .env with MariaDB credentials
- [ ] Add cache/queue database configs
- [ ] Verify APP_KEY is set (already exists)

---

## Phase 4: Fix Migration Files for MariaDB

### 4.1 Fix `2026_07_15_000002_add_two_month_to_round_frequency.php`

**Replace with raw SQL approach** for MariaDB compatibility:

```php
public function up(): void
{
    DB::statement("ALTER TABLE rounds MODIFY COLUMN frequency ENUM('daily','weekly','monthly','2_month') NOT NULL DEFAULT 'daily'");
}

public function down(): void
{
    DB::statement("ALTER TABLE rounds MODIFY COLUMN frequency ENUM('daily','weekly','monthly') NOT NULL DEFAULT 'daily'");
}
```

### 4.2 Add `->engine('InnoDB')` to all table creation migrations

Add `$table->engine('InnoDB');` after the `$table->id();` line in every:
- `0001_01_01_000000_create_users_table.php`
- `2019_12_14_000001_create_personal_access_tokens_table.php`
- `2026_06_24_061917_create_slots_table.php`
- `2026_06_24_061918_create_draws_table.php`
- `2026_06_24_061918_create_payments_table.php`
- `2026_06_24_061919_create_payment_logs_table.php`
- `2026_06_24_061919_create_savings_transactions_table.php`
- `2026_06_24_061919_create_sms_logs_table.php`
- `2026_06_24_061920_create_settings_table.php`
- `2026_07_04_000001_create_rounds_table.php`
- `2026_07_04_052325_create_cache_table.php`
- `2026_07_12_000001_create_categories_table.php`
- `2026_07_12_000002_create_promo_codes_table.php`

### 4.3 Fix FK constraint in `2026_07_12_000003_add_promo_code_to_users_table.php`

Check if it adds a proper foreign key or just a column. If just a column, add:
```php
$table->foreign('promo_code')->references('code')->on('promo_codes')->nullOnDelete();
```

- [ ] Fix enum ALTER in frequency migration
- [ ] Add InnoDB engine to all table creation migrations
- [ ] Fix promo_code FK constraint

---

## Phase 5: Generate Combined SQL Script

Instead of running `php artisan migrate` on the server (no SSH), generate a single SQL file from the migrations.

### 5.1 Generate SQL via local `mysqldump` or Artisan

**Option A: Use `php artisan db:dump` (if available)**

```bash
php artisan migrate --pretend > migrate.sql
```

This outputs the raw SQL that Laravel WOULD run, which we can then execute via phpMyAdmin.

**Option B: Hand-write the SQL**

Create a single `migrate.sql` file with:

```sql
-- ============================================
-- charisme_equb: Full Schema Migration
-- Target: MariaDB 10.11.18
-- ============================================

-- 1. categories
CREATE TABLE categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    label_en VARCHAR(255) NOT NULL,
    label_am VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
    max_members INT NOT NULL DEFAULT 10,
    min_deposit DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_rounds INT NOT NULL DEFAULT 30,
    collateral_type VARCHAR(50) NULL,
    license_type VARCHAR(100) NULL,
    requires_license TINYINT(1) NOT NULL DEFAULT 0,
    penalty_clause_en TEXT NULL,
    penalty_clause_am TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    metadata JSON NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_code (code),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. users
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    fayda_id VARCHAR(20) NULL,
    role ENUM('member','admin') NOT NULL DEFAULT 'member',
    status ENUM('active','lien') NOT NULL DEFAULT 'active',
    work_address VARCHAR(255) NULL,
    promo_code VARCHAR(20) NULL,
    registration_date DATE NOT NULL,
    remember_token VARCHAR(100) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_phone (phone),
    INDEX idx_role (role),
    INDEX idx_promo_code (promo_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. promo_codes
CREATE TABLE promo_codes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    broker_name VARCHAR(255) NOT NULL,
    broker_phone VARCHAR(20) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 2.00,
    total_registrations INT NOT NULL DEFAULT 0,
    total_earned DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_code (code),
    INDEX idx_broker_phone (broker_phone),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. rounds
CREATE TABLE rounds (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(20) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    frequency ENUM('daily','weekly','monthly','2_month') NOT NULL DEFAULT 'daily',
    people_goal INT NOT NULL,
    current_participants INT NOT NULL DEFAULT 0,
    total_rounds INT NOT NULL DEFAULT 1,
    winners_per_spin INT NOT NULL DEFAULT 1,
    current_round_number INT NOT NULL DEFAULT 1,
    start_date DATE NULL,
    end_date DATE NULL,
    status ENUM('draft','active','completed','cancelled') NOT NULL DEFAULT 'draft',
    auto_spin_enabled TINYINT(1) NOT NULL DEFAULT 1,
    last_auto_draw_at DATETIME NULL,
    spin_time TIME NOT NULL DEFAULT '08:00',
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    metadata JSON NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_category_status (category, status),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. slots
CREATE TABLE slots (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    round_id BIGINT UNSIGNED NULL,
    category VARCHAR(20) NOT NULL,
    slot_number INT NOT NULL,
    status ENUM('active','lien') NOT NULL DEFAULT 'active',
    has_won TINYINT(1) NOT NULL DEFAULT 0,
    deal_closed TINYINT(1) NOT NULL DEFAULT 0,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    consecutive_missed_sweeps INT NOT NULL DEFAULT 0,
    deposited_today TINYINT(1) NOT NULL DEFAULT 0,
    unique_payment_code VARCHAR(255) NULL,
    payout_code VARCHAR(255) NULL,
    registration_date DATE NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_round_id (round_id),
    UNIQUE INDEX idx_round_slot (round_id, slot_number),
    INDEX idx_status (status),
    CONSTRAINT fk_slots_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_slots_round FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. draws
CREATE TABLE draws (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    spin_id VARCHAR(100) NOT NULL UNIQUE,
    round VARCHAR(255) NULL,
    round_id BIGINT UNSIGNED NULL,
    category VARCHAR(20) NOT NULL,
    winning_slot INT NOT NULL,
    winner_name VARCHAR(255) NULL,
    net_payout DECIMAL(12,2) NULL,
    commission_amount DECIMAL(12,2) NULL,
    total_collected DECIMAL(12,2) NULL,
    draw_date DATETIME NOT NULL,
    is_auto TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_round_id (round_id),
    INDEX idx_category (category),
    INDEX idx_spin_id (spin_id),
    CONSTRAINT fk_draws_round FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. payments
CREATE TABLE payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slot_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    day_index INT NOT NULL,
    date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status ENUM('paid','unpaid') NOT NULL DEFAULT 'unpaid',
    trans_ref VARCHAR(255) NULL,
    method VARCHAR(50) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_slot_id (slot_id),
    INDEX idx_user_id (user_id),
    INDEX idx_date (date),
    UNIQUE INDEX idx_slot_day (slot_id, day_index),
    INDEX idx_status (status),
    CONSTRAINT fk_payments_slot FOREIGN KEY (slot_id) REFERENCES slots(id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. payment_logs
CREATE TABLE payment_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    user_name VARCHAR(255) NULL,
    amount DECIMAL(12,2) NOT NULL,
    status ENUM('success','failed') NOT NULL,
    payment_gateway VARCHAR(50) NULL,
    trans_ref VARCHAR(255) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_trans_ref (trans_ref),
    INDEX idx_created_at (created_at),
    CONSTRAINT fk_payment_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. savings_transactions
CREATE TABLE savings_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    slot_id BIGINT UNSIGNED NULL,
    type ENUM('deposit','withdrawal') NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    commission DECIMAL(12,2) NOT NULL DEFAULT 0,
    net_amount DECIMAL(12,2) NOT NULL,
    trans_ref VARCHAR(255) NULL,
    method VARCHAR(50) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_slot_id (slot_id),
    INDEX idx_type (type),
    CONSTRAINT fk_savings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_savings_slot FOREIGN KEY (slot_id) REFERENCES slots(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. sms_logs
CREATE TABLE sms_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    recipient VARCHAR(20) NOT NULL,
    type ENUM('reminder','winner','receipt','welcome','warning') NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at),
    CONSTRAINT fk_sms_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. settings
CREATE TABLE settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) NOT NULL UNIQUE,
    value JSON NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. password_reset_tokens
CREATE TABLE password_reset_tokens (
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NULL,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. personal_access_tokens
CREATE TABLE personal_access_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tokenable_type VARCHAR(255) NOT NULL,
    tokenable_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    abilities TEXT NULL,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_tokenable (tokenable_type, tokenable_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. sessions
CREATE TABLE sessions (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    payload LONGTEXT NOT NULL,
    last_activity INT NOT NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_last_activity (last_activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. cache
CREATE TABLE cache (
    `key` VARCHAR(255) NOT NULL PRIMARY KEY,
    value MEDIUMTEXT NOT NULL,
    expiration INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. cache_locks
CREATE TABLE cache_locks (
    `key` VARCHAR(255) NOT NULL PRIMARY KEY,
    owner VARCHAR(255) NOT NULL,
    expiration INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Migration tracking table (Laravel requires this)
-- ============================================
CREATE TABLE migrations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    migration VARCHAR(255) NOT NULL,
    batch INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO migrations (migration, batch) VALUES
('0001_01_01_000000_create_users_table', 1),
('2019_12_14_000001_create_personal_access_tokens_table', 1),
('2026_06_24_061917_create_slots_table', 1),
('2026_06_24_061918_create_draws_table', 1),
('2026_06_24_061918_create_payments_table', 1),
('2026_06_24_061919_create_payment_logs_table', 1),
('2026_06_24_061919_create_savings_transactions_table', 1),
('2026_06_24_061919_create_sms_logs_table', 1),
('2026_06_24_061920_create_settings_table', 1),
('2026_07_04_000001_create_rounds_table', 1),
('2026_07_04_000002_add_round_id_to_slots_table', 1),
('2026_07_04_000003_add_round_id_to_draws_table', 1),
('2026_07_04_000004_add_winners_per_spin_to_rounds_table', 1),
('2026_07_04_052325_create_cache_table', 1),
('2026_07_12_000001_create_categories_table', 1),
('2026_07_12_000002_create_promo_codes_table', 1),
('2026_07_12_000003_add_promo_code_to_users_table', 1),
('2026_07_15_000001_add_last_auto_draw_at_to_rounds_table', 1),
('2026_07_15_000002_add_two_month_to_round_frequency', 1);
```

- [ ] Generate `migrate.sql` from hand-written SQL
- [ ] Verify SQL syntax for MariaDB compatibility
- [ ] Add migrations tracking table insert

---

## Phase 6: Upload SQL to phpMyAdmin

| Step | Action | Details |
|------|--------|---------|
| 6.1 | Log into cPanel | Via browser |
| 6.2 | Open phpMyAdmin | cPanel → phpMyAdmin |
| 6.3 | Select `charisme_equb` database | From left sidebar |
| 6.4 | Click SQL tab | |
| 6.5 | Paste or upload `migrate.sql` | Use file upload or paste text |
| 6.6 | Click Go | Execute |

- [ ] Log into cPanel
- [ ] Open phpMyAdmin
- [ ] Select charisme_equb database
- [ ] Execute migrate.sql
- [ ] Verify all 15 tables + 5 pivot/helper tables created

---

## Phase 7: Seed Initial Data

Create a `seed.sql` with:

```sql
-- Admin user (password: admin123, bcrypt hash)
INSERT INTO users (name, phone, email, password, role, status, registration_date, created_at, updated_at)
VALUES ('Admin', '0920190438', 'admin@equb.com', '$2y$12$...bcrypt_hash...', 'admin', 'active', CURDATE(), NOW(), NOW());

-- Categories (tiers)
INSERT INTO categories (code, label_en, label_am, amount, frequency, max_members, total_rounds, is_active, sort_order, created_at, updated_at) VALUES
('500', 'Birr 500', 'ብር 500', 500.00, 'daily', 30, 30, 1, 1, NOW(), NOW()),
('1000', 'Birr 1000', 'ብር 1000', 1000.00, 'daily', 30, 30, 1, 2, NOW(), NOW()),
('2000', 'Birr 2000', 'ብር 2000', 2000.00, 'daily', 30, 30, 1, 3, NOW(), NOW()),
('5000', 'Birr 5000', 'ብር 5000', 5000.00, 'weekly', 20, 12, 1, 4, NOW(), NOW()),
('savings', 'Savings', 'ቁጠባ', 0.00, 'daily', 100, 1, 1, 5, NOW(), NOW());

-- Default settings
INSERT INTO settings (`key`, value, created_at, updated_at) VALUES
('app_name', '{"en":"Gojo Equb","am":"ጎጆ ዕቁብ"}', NOW(), NOW()),
('commission_rate', '{"default":10}', NOW(), NOW()),
('spin_time', '{"time":"08:00","timezone":"Africa/Addis_Ababa"}', NOW(), NOW()),
('auto_spin', '{"enabled":true}', NOW(), NOW()),
('contact', '{"phone":"+251920190438"}', NOW(), NOW());
```

- [ ] Generate seed.sql with admin user
- [ ] Add seed data for categories (5 tiers)
- [ ] Add default settings
- [ ] Execute seed.sql via phpMyAdmin

---

## Phase 8: Verify & Test

| Step | Check | How |
|------|-------|-----|
| 8.1 | Table count | Should have 17 tables (15 data + migrations + cache_locks) |
| 8.2 | Foreign keys | Verify FK constraints exist correctly |
| 8.3 | Indexes | Check UNIQUE and INDEX constraints |
| 8.4 | Seed data | Verify admin user exists, categories populated, settings present |
| 8.5 | API login test | POST to /api/login with admin credentials |
| 8.6 | API tier list | GET /api/tiers should return 5 categories |

- [ ] Verify table count = 17
- [ ] Verify foreign key constraints
- [ ] Verify seed data
- [ ] Test API endpoints

---

## Progress Summary

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Fix migration compatibility issues | ⬜ Pending |
| 2 | Create database user in cPanel | ⬜ Pending |
| 3 | Update backend .env for MariaDB | ⬜ Pending |
| 4 | Fix migration files for MariaDB | ⬜ Pending |
| 5 | Generate combined SQL script | ⬜ Pending |
| 6 | Upload SQL to phpMyAdmin | ⬜ Pending |
| 7 | Seed initial data | ⬜ Pending |
| 8 | Verify & test | ⬜ Pending |
