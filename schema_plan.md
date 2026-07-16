# Schema Plan — `charisme_equb`

**Engine:** MariaDB 10.11.18 | **Charset:** utf8mb4 | **Collation:** utf8mb4_unicode_ci

---

## 1. `categories` — Tier / Category Definitions

Defines the different equb tiers (500, 1000, 2000, 5000, savings).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| code | VARCHAR(20) | UNIQUE, NOT NULL | e.g. `'500'`, `'1000'`, `'2000'`, `'5000'`, `'savings'` |
| label_en | VARCHAR(100) | NOT NULL | e.g. `"Birr 500"` |
| label_am | VARCHAR(100) | NULLABLE | Amharic label |
| amount | DECIMAL(12,2) | NOT NULL | Daily contribution amount |
| frequency | ENUM('daily','weekly','monthly','2_month') | NOT NULL, DEFAULT 'daily' | |
| max_members | INT | NOT NULL | Slot capacity |
| min_deposit | DECIMAL(12,2) | NULLABLE | |
| total_rounds | INT | NOT NULL | Number of rounds in a cycle |
| collateral_type | VARCHAR(50) | NULLABLE | |
| license_type | VARCHAR(50) | NULLABLE | |
| requires_license | TINYINT(1) | DEFAULT 0 | |
| penalty_clause_en | TEXT | NULLABLE | |
| penalty_clause_am | TEXT | NULLABLE | |
| is_active | TINYINT(1) | DEFAULT 1 | |
| sort_order | INT | DEFAULT 0 | Display ordering |
| metadata | JSON | NULLABLE | Extra config |
| created_at | TIMESTAMP | NULLABLE | |
| updated_at | TIMESTAMP | NULLABLE | |

---

## 2. `users` — All Platform Users

Members + admins.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| name | VARCHAR(100) | NOT NULL | |
| phone | VARCHAR(20) | UNIQUE, NOT NULL | Primary identifier for auth |
| email | VARCHAR(100) | UNIQUE, NULLABLE | |
| password | VARCHAR(255) | NOT NULL | bcrypt hashed |
| fayda_id | VARCHAR(100) | NULLABLE | Ethiopian digital ID |
| role | ENUM('member','admin') | NOT NULL, DEFAULT 'member' | |
| status | ENUM('active','lien') | NOT NULL, DEFAULT 'active' | |
| work_address | TEXT | NULLABLE | |
| promo_code | VARCHAR(20) | NULLABLE, FK → promo_codes.code | Referral code used at signup |
| registration_date | DATE | NULLABLE | |
| remember_token | VARCHAR(100) | NULLABLE | Laravel auth |
| created_at | TIMESTAMP | NULLABLE | |
| updated_at | TIMESTAMP | NULLABLE | |

**Indexes:** INDEX on `phone`, INDEX on `role`, INDEX on `promo_code`

---

## 3. `promo_codes` — Referral / Broker Codes

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| code | VARCHAR(30) | UNIQUE, NOT NULL | e.g. `'PROMO-XXXXXXXX'` |
| broker_name | VARCHAR(100) | NULLABLE | |
| broker_phone | VARCHAR(20) | NULLABLE | |
| commission_rate | DECIMAL(5,2) | NOT NULL, DEFAULT 2.00 | Percentage |
| total_registrations | INT | DEFAULT 0 | |
| total_earned | DECIMAL(12,2) | DEFAULT 0.00 | |
| status | ENUM('active','inactive') | DEFAULT 'active' | |
| created_at | TIMESTAMP | NULLABLE | |
| updated_at | TIMESTAMP | NULLABLE | |

---

## 4. `rounds` — Equb Game Rounds

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| name | VARCHAR(100) | NULLABLE | |
| category | VARCHAR(20) | NOT NULL | FK-style ref to categories.code |
| amount | DECIMAL(12,2) | NOT NULL | Daily contribution |
| frequency | ENUM('daily','weekly','monthly','2_month') | NOT NULL | |
| people_goal | INT | NOT NULL | Max participants |
| current_participants | INT | DEFAULT 0 | |
| total_rounds | INT | NOT NULL | |
| winners_per_spin | INT | DEFAULT 1 | |
| current_round_number | INT | DEFAULT 0 | |
| start_date | DATE | NULLABLE | |
| end_date | DATE | NULLABLE | |
| status | ENUM('draft','active','completed','cancelled') | DEFAULT 'draft' | |
| auto_spin_enabled | TINYINT(1) | DEFAULT 0 | |
| last_auto_draw_at | DATETIME | NULLABLE | |
| spin_time | TIME | NULLABLE | Scheduled draw time |
| commission_rate | DECIMAL(5,2) | DEFAULT 10.00 | Platform commission % |
| metadata | JSON | NULLABLE | |
| created_at | TIMESTAMP | NULLABLE | |
| updated_at | TIMESTAMP | NULLABLE | |

**Indexes:** INDEX on `status`, INDEX on `category`, INDEX on `(status, frequency)`

---

## 5. `slots` — Member Positions in Rounds

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| user_id | BIGINT UNSIGNED | FK → users.id, NOT NULL | |
| round_id | BIGINT UNSIGNED | FK → rounds.id, NULLABLE | Nullable for unassigned slots |
| category | VARCHAR(20) | NOT NULL | |
| slot_number | INT | NOT NULL | Position number |
| status | ENUM('active','lien') | DEFAULT 'active' | |
| has_won | TINYINT(1) | DEFAULT 0 | |
| deal_closed | TINYINT(1) | DEFAULT 0 | |
| balance | DECIMAL(12,2) | DEFAULT 0.00 | |
| consecutive_missed_sweeps | INT | DEFAULT 0 | |
| deposited_today | TINYINT(1) | DEFAULT 0 | |
| unique_payment_code | VARCHAR(50) | NULLABLE | For USSD/transaction ref |
| payout_code | VARCHAR(50) | NULLABLE | |
| registration_date | DATE | NULLABLE | |
| created_at | TIMESTAMP | NULLABLE | |
| updated_at | TIMESTAMP | NULLABLE | |

**Indexes:** INDEX on `user_id`, INDEX on `round_id`, INDEX on `(round_id, slot_number)` UNIQUE, INDEX on `status`

---

## 6. `draws` — Spin / Draw Results

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| spin_id | VARCHAR(100) | UNIQUE, NOT NULL | External reference |
| round | VARCHAR(100) | NULLABLE | Round name at draw time |
| round_id | BIGINT UNSIGNED | FK → rounds.id, NULLABLE | |
| category | VARCHAR(20) | NOT NULL | |
| winning_slot | INT | NOT NULL | Slot number that won |
| winner_name | VARCHAR(100) | NULLABLE | |
| net_payout | DECIMAL(12,2) | NULLABLE | |
| commission_amount | DECIMAL(12,2) | NULLABLE | |
| total_collected | DECIMAL(12,2) | NULLABLE | |
| draw_date | DATETIME | NOT NULL | |
| is_auto | TINYINT(1) | DEFAULT 0 | Was it an auto-spin? |
| created_at | TIMESTAMP | NULLABLE | |
| updated_at | TIMESTAMP | NULLABLE | |

**Indexes:** INDEX on `round_id`, INDEX on `category`, INDEX on `spin_id` UNIQUE

---

## 7. `payments` — Per-Day Payment Records

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| slot_id | BIGINT UNSIGNED | FK → slots.id, NOT NULL | |
| user_id | BIGINT UNSIGNED | FK → users.id, NOT NULL | |
| day_index | INT | NOT NULL | Day number in the cycle |
| date | DATE | NOT NULL | Payment date |
| amount | DECIMAL(12,2) | NOT NULL | |
| status | ENUM('paid','unpaid') | DEFAULT 'unpaid' | |
| trans_ref | VARCHAR(100) | NULLABLE | Transaction reference |
| method | VARCHAR(50) | NULLABLE | Payment method |
| created_at | TIMESTAMP | NULLABLE | |
| updated_at | TIMESTAMP | NULLABLE | |

**Indexes:** INDEX on `slot_id`, INDEX on `user_id`, INDEX on `date`, UNIQUE on `(slot_id, day_index)`, INDEX on `status`

---

## 8. `payment_logs` — Payment Audit Trail

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| user_id | BIGINT UNSIGNED | FK → users.id, NOT NULL | |
| user_name | VARCHAR(100) | NULLABLE | Denormalized for audit |
| amount | DECIMAL(12,2) | NOT NULL | |
| status | ENUM('success','failed') | NOT NULL | |
| payment_gateway | VARCHAR(50) | NULLABLE | |
| trans_ref | VARCHAR(100) | NULLABLE | |
| created_at | TIMESTAMP | NULLABLE | |
| updated_at | TIMESTAMP | NULLABLE | |

**Indexes:** INDEX on `user_id`, INDEX on `trans_ref`, INDEX on `created_at`

---

## 9. `savings_transactions` — Savings Deposits & Withdrawals

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| user_id | BIGINT UNSIGNED | FK → users.id, NOT NULL | |
| slot_id | BIGINT UNSIGNED | FK → slots.id, NULLABLE | |
| type | ENUM('deposit','withdrawal') | NOT NULL | |
| amount | DECIMAL(12,2) | NOT NULL | |
| commission | DECIMAL(12,2) | DEFAULT 0.00 | 2% on withdrawals |
| net_amount | DECIMAL(12,2) | NOT NULL | |
| trans_ref | VARCHAR(100) | NULLABLE | |
| method | VARCHAR(50) | NULLABLE | |
| created_at | TIMESTAMP | NULLABLE | |
| updated_at | TIMESTAMP | NULLABLE | |

**Indexes:** INDEX on `user_id`, INDEX on `slot_id`, INDEX on `type`

---

## 10. `sms_logs` — SMS History

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| user_id | BIGINT UNSIGNED | FK → users.id, NULLABLE | |
| recipient | VARCHAR(20) | NOT NULL | Phone number |
| type | ENUM('reminder','winner','receipt','welcome','warning') | NOT NULL | |
| message | TEXT | NOT NULL | |
| created_at | TIMESTAMP | NULLABLE | |
| updated_at | TIMESTAMP | NULLABLE | |

**Indexes:** INDEX on `user_id`, INDEX on `type`, INDEX on `created_at`

---

## 11. `settings` — Application Settings

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| key | VARCHAR(100) | UNIQUE, NOT NULL | |
| value | JSON | NOT NULL | |
| created_at | TIMESTAMP | NULLABLE | |
| updated_at | TIMESTAMP | NULLABLE | |

---

## 12. `password_reset_tokens` — Auth

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| email | VARCHAR(100) | NOT NULL | |
| token | VARCHAR(255) | NOT NULL | |
| created_at | TIMESTAMP | NULLABLE | |

**Index:** INDEX on `email`

---

## 13. `personal_access_tokens` — Sanctum API Tokens

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| tokenable_type | VARCHAR(255) | NOT NULL | Morph type |
| tokenable_id | BIGINT UNSIGNED | NOT NULL | Morph ID |
| name | VARCHAR(255) | NOT NULL | |
| token | VARCHAR(64) | UNIQUE, NOT NULL | 64-char hash |
| abilities | TEXT | NULLABLE | JSON array |
| last_used_at | TIMESTAMP | NULLABLE | |
| expires_at | TIMESTAMP | NULLABLE | |
| created_at | TIMESTAMP | NULLABLE | |
| updated_at | TIMESTAMP | NULLABLE | |

**Indexes:** INDEX on `tokenable_type, tokenable_id`, UNIQUE on `token`

---

## 14. `sessions` — Web Sessions (Laravel)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | VARCHAR(255) | PK | Session ID |
| user_id | BIGINT UNSIGNED | NULLABLE, FK → users.id | |
| ip_address | VARCHAR(45) | NULLABLE | |
| user_agent | TEXT | NULLABLE | |
| payload | LONGTEXT | NOT NULL | |
| last_activity | INT | NOT NULL | Unix timestamp |

**Index:** INDEX on `last_activity`

---

## 15. `cache` / `cache_locks` — Laravel Cache

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| key | VARCHAR(255) | PK | |
| value | MEDIUMTEXT | NOT NULL | |
| expiration | INT | NOT NULL | |

---

## Entity Relationship Summary

```
users ──1:N──> slots ──N:1──> rounds
users ──1:N──> payments
users ──1:N──> payment_logs
users ──1:N──> savings_transactions
users ──1:N──> sms_logs
users ──1:1──> promo_codes (via promo_code field)

rounds ──1:N──> draws
rounds ──1:N──> slots

slots ──1:N──> payments
slots ──1:N──> savings_transactions

categories.code ──reference──> rounds.category
categories.code ──reference──> slots.category
categories.code ──reference──> draws.category
```

## MySQL / MariaDB Differences from SQLite

The backend currently uses SQLite (Laravel default). When migrating to MariaDB:
- `INTEGER` → `INT` or `BIGINT UNSIGNED`
- `TINYINT(1)` replaces SQLite's lack of boolean type
- `JSON` column type (native MariaDB)
- `ENUM` types for constrained string fields
- `DEFAULT CURRENT_TIMESTAMP` vs SQLite's behavior
- Drop `PRAGMA` statements, use `ENGINE=InnoDB`
- Foreign keys need explicit `ON DELETE CASCADE` / `ON DELETE SET NULL`
