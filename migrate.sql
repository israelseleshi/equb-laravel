-- ============================================
-- charisme_equb: Full Schema Migration
-- Target: MariaDB 10.11.18
-- Generated: 2026-07-15
-- ============================================

-- 1. categories
CREATE TABLE IF NOT EXISTS categories (
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
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS promo_codes (
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
CREATE TABLE IF NOT EXISTS rounds (
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
CREATE TABLE IF NOT EXISTS slots (
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
CREATE TABLE IF NOT EXISTS draws (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    spin_id VARCHAR(100) NOT NULL UNIQUE,
    round VARCHAR(255) NULL,
    round_id BIGINT UNSIGNED NULL,
    category VARCHAR(20) NOT NULL,
    winning_slot INT NOT NULL,
    winner_name VARCHAR(255) NULL,
    net_payout DECIMAL(12,2) NULL,
    commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_collected DECIMAL(12,2) NOT NULL DEFAULT 0,
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
CREATE TABLE IF NOT EXISTS payments (
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
CREATE TABLE IF NOT EXISTS payment_logs (
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
CREATE TABLE IF NOT EXISTS savings_transactions (
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
CREATE TABLE IF NOT EXISTS sms_logs (
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
CREATE TABLE IF NOT EXISTS settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) NOT NULL UNIQUE,
    value JSON NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. password_reset_tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NULL,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. personal_access_tokens
CREATE TABLE IF NOT EXISTS personal_access_tokens (
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
CREATE TABLE IF NOT EXISTS sessions (
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
CREATE TABLE IF NOT EXISTS cache (
    `key` VARCHAR(255) NOT NULL PRIMARY KEY,
    value MEDIUMTEXT NOT NULL,
    expiration INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. cache_locks
CREATE TABLE IF NOT EXISTS cache_locks (
    `key` VARCHAR(255) NOT NULL PRIMARY KEY,
    owner VARCHAR(255) NOT NULL,
    expiration INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Migration tracking table (Laravel requires this)
-- ============================================
CREATE TABLE IF NOT EXISTS migrations (
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

-- ============================================
-- Seed Data
-- ============================================

-- Admin user (password: EqubApp2026Live, bcrypt hash)
-- Generated hash for: EqubApp2026Live
INSERT INTO users (name, phone, email, password, role, status, registration_date, created_at, updated_at)
VALUES ('Admin', '0920190438', 'admin@equb.com', '$2y$12$8VG6yQYq1mFYZy5nXFOKMejh7VcJcL3GdHTHgMuuSUFJrAonqHlGe', 'admin', 'active', CURDATE(), NOW(), NOW());

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

-- ============================================
-- End of migration
-- ============================================
