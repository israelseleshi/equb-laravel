# 🎭 Equb — Playwright System Test Plan

> **Goal:** Validate end-to-end user journeys across the full Gojo Equb stack
> (Expo React Native frontend + Laravel PHP backend + SQLite database).
>
> **Tool:** [Playwright](https://playwright.dev) (v1.50+)
> **Platform targets:** Chrome (desktop web), Chromium (Expo Web), Android WebView
> **CI:** GitHub Actions (`ubuntu-latest`, with `services.sqlite`)

---

## Table of Contents

1. [Infrastructure Setup](#1-infrastructure-setup)
2. [Test Data Strategy](#2-test-data-strategy)
3. [Authentication Flows](#3-authentication-flows)
4. [Member Onboarding & Registration](#4-member-onboarding--registration)
5. [Member Dashboard Flows](#5-member-dashboard-flows)
6. [Savings Account Flows](#6-savings-account-flows)
7. [Admin Authentication & Gate](#7-admin-authentication--gate)
8. [Admin Dashboard — Overview](#8-admin-dashboard--overview)
9. [Admin — Round Management](#9-admin--round-management)
10. [Admin — Member Management](#10-admin--member-management)
11. [Admin — Draw & Payout Flows](#11-admin--draw--payout-flows)
12. [Admin — Promo Code Management](#12-admin--promo-code-management)
13. [Admin — Payment Monitoring](#13-admin--payment-monitoring)
14. [Admin — SMS Logs & Notifications](#14-admin--sms-logs--notifications)
15. [Category & Tier Configuration](#15-category--tier-configuration)
16. [Language & Internationalisation](#16-language--internationalisation)
17. [Security & Edge Cases](#17-security--edge-cases)
18. [Performance & Thresholds](#18-performance--thresholds)
19. [CI/CD Integration](#19-cicd-integration)
20. [Appendix — Page Object Classes](#20-appendix--page-object-classes)

---

## 1. Infrastructure Setup

### 1.1 Directory Structure

```
e2e/
├── playwright.config.ts           # Playwright configuration
├── fixtures/
│   ├── auth.fixture.ts            # Authenticated page fixture
│   └── admin.fixture.ts           # Admin-authenticated page fixture
├── pages/
│   ├── LandingPage.ts             # / (landing / portal)
│   ├── LoginPage.ts              # /login
│   ├── SignupPage.ts             # /signup
│   ├── ForgotPasswordPage.ts     # /forgot-password
│   ├── DashboardPage.ts          # /dashboard (member)
│   ├── SavingsPage.ts            # savings tab within dashboard
│   ├── TourPage.ts               # onboarding wizard
│   ├── AdminLoginGate.ts         # AuthGate security screen
│   ├── AdminDashboardPage.ts     # /admin (6 tabs)
│   ├── RoundsPage.ts             # admin → rounds tab
│   ├── MembersPage.ts            # admin → members tab
│   ├── WinnersPage.ts            # admin → winners tab
│   ├── PaymentsPage.ts           # admin → payments tab
│   ├── PromoPage.ts              # admin → promo tab
│   └── SmsLogPage.ts             # admin → SMS logs tab
├── data/
│   └── test-data.ts              # Factories & seed helpers
├── utils/
│   ├── api-client.ts             # Direct API calls for setup/teardown
│   ├── db-client.ts              # Optional direct DB assertions
│   └── wait-for.ts               # Polling & retry helpers
├── specs/
│   ├── auth.spec.ts
│   ├── onboarding.spec.ts
│   ├── member-dashboard.spec.ts
│   ├── savings.spec.ts
│   ├── admin-auth.spec.ts
│   ├── admin-overview.spec.ts
│   ├── admin-rounds.spec.ts
│   ├── admin-members.spec.ts
│   ├── admin-draw.spec.ts
│   ├── admin-promo.spec.ts
│   ├── admin-payments.spec.ts
│   ├── i18n.spec.ts
│   └── security.spec.ts
└── reports/                       # Screenshots, videos, traces
```

### 1.2 Playwright Configuration (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './specs',
  fullyParallel: false, // sequential per-file for DB isolation
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // single worker so SQLite DB isn't shared
  reporter: [
    ['html', { outputFolder: 'reports/html' }],
    ['json', { outputFile: 'reports/test-results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8081', // Expo web
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
})
```

### 1.3 Global Setup & Teardown

A `globalSetup` script will:

1. Start the Laravel backend on a test DB (`php artisan serve --env=testing`)
2. Run migrations & seed minimal data
3. Start the Expo web dev server
4. Return the server PIDs for teardown

A `globalTeardown` script will:
1. Kill both servers
2. Archive reports/artifacts

### 1.4 Test Isolation Strategy

| Concern | Approach |
|---------|----------|
| **Database** | Each `spec.ts` file wraps with `beforeAll` that resets DB via API call `POST /api/testing/reset` |
| **Auth state** | Use `storageState` per role (member, admin) to avoid re-login every test |
| **Shared data** | `test-data.ts` factory creates users, rounds, slots via direct API calls in `beforeEach` |
| **Parallelism** | 1 worker — sequential execution. Each file gets a fresh DB |

---

## 2. Test Data Strategy

### 2.1 Helper Factories (`data/test-data.ts`)

```typescript
// ── Core test data builders ──

interface SeedConfig {
  members?: number
  rounds?: number
  slotsPerRound?: number
  draws?: number
  paymentsPerMember?: number
  promoCount?: number
}

/** Build a full test universe via the API */
async function seedTestData(config: SeedConfig, apiToken: string): Promise<SeedState>

/** Create a single member with a slot */
async function createMemberWithSlot(
  api: ApiClient,
  overrides?: Partial<MemberData>
): Promise<{ user: UserData; slot: SlotData; token: string }>

/** Create a complete round: draft → fill → activate */
async function createActiveRound(
  api: ApiClient,
  overrides?: Partial<RoundData>
): Promise<RoundData>

/** Run a draw on an active round */
async function runDrawForRound(
  api: ApiClient,
  roundId: number,
  adminToken: string
): Promise<DrawData>
```

### 2.2 API Client Protocol

The `api-client.ts` helper wraps `fetch()` for direct REST calls to the Laravel backend.

```typescript
export class ApiClient {
  private base: string
  private token: string

  async post<T>(path: string, body?: unknown): Promise<T>
  async get<T>(path: string): Promise<T>
  async delete<T>(path: string): Promise<T>

  /** Register a new member & return token */
  async registerMember(data: RegisterInput): Promise<{ token: string; user: UserData }>

  /** Login as admin and return token */
  async loginAsAdmin(): Promise<string>

  /** Reset database to clean state */
  async resetDatabase(): Promise<void>
}
```

---

## 3. Authentication Flows

### 3.1 User Registration

```
Feature: Member Registration
  As a new user
  I want to create an account
  So that I can join Equb groups

  Scenario: Complete registration with valid data
    Given I am on the Landing page
    When I tap "ለመጀመር / Sign Up"
    Then I am redirected to the Signup page
    When I fill in:
      | Field        | Value            |
      | Name         | Abebe Kebede     |
      | Phone        | 0912345678       |
      | Password     | SecurePass1!     |
      | Category     | 500 ETB          |
    And I tap "ተመዝገብ / Register"
    Then I see my Dashboard with a welcome message
    And my slot shows "500 ETB" category
    And the API returns 201 with token

  Scenario: Duplicate phone number
    Given a user already exists with phone 0912345678
    When I try to register with the same phone
    Then I see "Phone already registered" error
    And the form is not submitted

  Scenario: Invalid password (too short)
    When I fill password with "abc12"
    Then I see "Password must be at least 6 characters"
    And the register button is disabled

  Scenario: Registration with promo code
    Given a valid promo code "PROMO-TEST" exists
    When I register with promo_code = "PROMO-TEST"
    Then my account is created
    And the broker gets credited with a commission

  Scenario: Amharic registration flow
    When I switch the language to አማርኛ
    And I register with valid Amharic data
    Then all labels are displayed in Amharic
    And the dashboard greeting is in Amharic
```

### 3.2 Login

```
Feature: User Login
  As a registered member
  I want to log into my account
  So that I can manage my Equb

  Scenario: Successful login
    Given a member exists with phone 0912345678 and password SecurePass1
    When I navigate to the Login page
    And I enter phone "0912345678"
    And I enter password "SecurePass1"
    And I tap "ግባ / Sign In"
    Then I am redirected to the Member Dashboard
    And my name appears in the header

  Scenario: Wrong password
    When I enter phone "0912345678" and password "wrong"
    And I tap "ግባ / Sign In"
    Then I see "Invalid phone or password"
    And I remain on the Login page

  Scenario: Non-existent phone
    When I enter phone "0999999999" and password "anything"
    Then I see "Invalid phone or password"
    And I remain on the Login page

  Scenario: Remember me — session persistence
    When I login successfully and close the browser tab
    And I reopen the app
    Then I am still logged in (token stored in AsyncStorage)

  Scenario: Logout
    Given I am logged in
    When I tap the logout button
    Then my token is invalidated
    And I am returned to the Landing page
    And protected routes redirect to Login
```

### 3.3 Password Reset Flow

```
Feature: Password Reset
  As a member who forgot their password
  I want to reset it via OTP
  So that I regain access to my account

  Scenario: Request OTP for existing phone
    Given I am on the Forgot Password page
    When I enter phone "0912345678"
    And I tap "ላክ / Send"
    Then I see "Reset code sent to your phone"
    And an OTP is stored in the cache

  Scenario: Submit valid OTP and new password
    Given I have requested an OTP
    When I enter valid OTP "123456"
    And I enter new password "NewPass123!"
    And I confirm the password
    Then I see "Password reset successfully"
    And I can login with the new password

  Scenario: Expired OTP
    When I submit an OTP after 10 minutes
    Then I see "Code expired, request a new one"

  Scenario: Non-existent phone
    When I request password reset for "0999999999"
    Then I still see "Reset code sent to your phone"
    (No information leak — user enumeration prevention)

  Scenario: Mismatched passwords
    When I enter password "NewPass1" and confirmation "Different1"
    Then I see "Passwords do not match"
```

---

## 4. Member Onboarding & Registration

### 4.1 Onboarding Wizard

```
Feature: Onboarding Wizard
  As a first-time user
  I want to see the onboarding tour
  So that I understand how Equb works

  Scenario: First visit shows tour
    Given I am a newly registered user
    When I first access the Dashboard
    Then I see the TourOverlay with 3-4 steps
    And each step explains a feature

  Scenario: Tour completion
    When I tap through all tour steps
    Then I see the "ጀምር / Start" button on the last step
    When I tap "ጀምር / Start"
    Then the tour disappears
    And I never see it again

  Scenario: Tour skip
    When I tap the close/skip button on any step
    Then the tour disappears
    And I never see it again

  Scenario: Tour in Amharic
    When I set language to አማርኛ
    Then the tour steps are displayed in Amharic
```

### 4.2 Landing Page (Portal View)

```
Feature: Landing / Portal Page
  As a visitor
  I want to see the Equb information
  So that I understand the service

  Scenario: Landing page loads
    Given I am on the Landing page
    Then I see the Gojo Equb logo
    And I see "Your Trusted Savings Companion"
    And I see the spinning jar animation
    And I see the tier cards (500, 1000, 2000, 5000 ETB)

  Scenario: Tier cards display correctly
    Then I see 4 tier cards:
      | Tier     | Amount  | Slots | Progress |
      |----------|---------|-------|----------|
      | 500 ETB  | 500     | N     | XX%      |
      | 1000 ETB | 1000    | M     | XX%      |
      | 2000 ETB | 2000    | K     | XX%      |
      | 5000 ETB | 5000    | J     | XX%      |
    And each card shows a progress bar

  Scenario: Active rounds shown
    Given there are active rounds
    Then I see a list of active rounds with their details

  Scenario: Recent winners displayed
    Given there are recent draws
    Then I see a "Recent Winners" section
    And each winner shows category, date, and amount won

  Scenario: Bottom tab navigation
    Then I see bottom tabs: "መነሻ/Home", "ሰንጠረዥ/Dashboard", "ሌሎች/Others"
    When I tap "ሰንጠረዥ/Dashboard"
    Then I see the public dashboard
```

---

## 5. Member Dashboard Flows

### 5.1 Dashboard Overview

```
Feature: Member Dashboard
  As a logged-in member
  I want to view my Equb status
  So that I know my payments and position

  Scenario: Dashboard loads with member data
    Given I am logged in as a member
    When I navigate to the Dashboard
    Then I see my name and phone
    And I see my slot(s) with category
    And I see my balance
    And I see my next payment due date

  Scenario: Multiple slots displayed
    Given I have slots in 500 and 1000 ETB
    Then each slot shows in a separate card
    And each card shows category, slot number, status

  Scenario: Payment schedule visible
    Then I see a payment schedule table
    And each day shows status (paid/unpaid)
    And I can scroll through days

  Scenario: Pay a day
    When I tap an unpaid day
    Then I see a confirmation "Pay now?"
    When I confirm
    Then the status changes to "paid"
    And a success toast appears

  Scenario: Pay multiple days
    When I long-press to select multiple unpaid days
    And I tap "Pay Selected"
    Then all selected days show "paid"
    And total deducted is shown

  Scenario: Payment receipt
    Given I have a paid day
    When I tap "View Receipt"
    Then I see a receipt modal with:
      - Transaction reference
      - Amount paid
      - Date
      - Payment method (USSD)
    And I can download/print the receipt

  Scenario: Download payment statement
    When I tap "Download Statement"
    Then an HTML statement is generated
    And a download is triggered in the browser
```

### 5.2 Slot Details

```
Feature: Slot Detail View
  As a member
  I want to see details of each slot

  Scenario: Slot detail card
    When I tap on a slot card
    Then I see:
      - Category & amount
      - Slot number
      - Registration date
      - Status (active/lien)
      - Consecutive missed sweeps
      - Total balance

  Scenario: Lien status warning
    Given my slot has consecutive_missed_sweeps > 3
    Then I see a warning banner "You have missed X payments"
    And I see instructions to contact admin

  Scenario: Has won badge
    Given my slot has_won = true
    Then I see a "Winner" badge on the slot card
    And the draw date and payout amount
```

---

## 6. Savings Account Flows

### 6.1 Savings Dashboard

```
Feature: Savings Account
  As a member with a savings slot
  I want to deposit and withdraw
  So that I manage my savings

  Scenario: Savings tab shown for savings category
    Given I have a slot with category "savings"
    Then I see a "Savings" tab or section
    And I see my current balance

  Scenario: Deposit flow
    When I tap "ተቀማጭ / Deposit"
    And I enter amount "500"
    And I tap "አረጋግጥ / Confirm"
    Then I see success "500 ETB deposited"
    And my balance increases by 500
    And the transaction appears in the deposits list

  Scenario: Deposit validation — minimum
    When I enter amount "5"
    Then I see "Minimum deposit is 10 ETB"
    And the confirm button is disabled

  Scenario: Withdrawal flow
    Given my balance is 2000 ETB
    When I tap "አውጣ / Withdraw"
    Then I see a confirmation with:
      - Max withdrawal: 1600 ETB (80%)
      - Commission: 32 ETB (2%)
      - Net amount: 1568 ETB
    When I confirm
    Then I see success
    And my balance is reduced
    And the transaction appears in withdrawals list

  Scenario: Withdrawal — insufficient balance
    Given my balance is 50 ETB
    When I attempt to withdraw
    Then I see "Insufficient balance. Minimum withdrawal is 100 ETB."

  Scenario: Savings statement download
    When I tap "Download Statement"
    Then an HTML statement with all transactions is generated
    And download is triggered
```

---

## 7. Admin Authentication & Gate

### 7.1 Auth Gate Security

```
Feature: Admin Auth Gate
  As an admin user
  I want to pass through the biometric/pin gate
  So that unauthorized users cannot access admin functions

  Scenario: Admin login from portal
    Given I am an admin user
    When I login with admin credentials
    Then I am shown the AuthGate screen
    And I see an option for PIN or biometric

  Scenario: Correct PIN unlocks admin panel
    When I enter the correct admin PIN
    Then the AuthGate dismisses
    And I can access the admin dashboard

  Scenario: Wrong PIN with retry
    When I enter wrong PIN 3 times
    Then I see "Too many attempts. Try again later."
    And the input is locked for 60 seconds

  Scenario: Cancel from AuthGate
    When I tap cancel on AuthGate
    Then I am returned to the Landing page
    And I do not see admin content
```

---

## 8. Admin Dashboard — Overview

### 8.1 Stats & Overview Tab

```
Feature: Admin Dashboard Overview
  As an admin
  I want to see platform statistics
  So that I monitor the health of the Equb

  Scenario: Overview loads with real data
    Given there are:
      - 15 members
      - 20 slots (3 of them lien)
      - 5 rounds (2 active)
      - Total balance: 150,000 ETB
      - Total payouts: 45,000 ETB
    When I view the Overview tab
    Then I see stat cards:
      | Metric         | Value              |
      |----------------|--------------------|
      | Total Users    | 15                 |
      | Total Slots    | 20                 |
      | Total Balance  | ETB 150,000        |
      | Total Payouts  | ETB 45,000         |
    And I see a "By Category" breakdown
    And I see a "Risk Status" card with lien count

  Scenario: Slots by category chart
    Then the "By Category" section shows:
      | Category | Slots | Balance |
      |----------|-------|---------|
      | 500      | 8     | X       |
      | 1000     | 6     | Y       |
      | 2000     | 4     | Z       |
      | 5000     | 2     | W       |

  Scenario: Lien slots highlighted
    Then the "Risk Status" shows active lien count
    And delinquent slots with missed payments count
```

---

## 9. Admin — Round Management

### 9.1 Rounds CRUD

```
Feature: Admin Round Management
  As an admin
  I want to create and manage rounds
  So that the Equb operates smoothly

  Scenario: List rounds
    Given there are 5 rounds
    When I navigate to the Rounds tab
    Then I see all 5 rounds in a list
    And each card shows:
      - Round name
      - Category
      - Status badge (draft/active/completed/cancelled)
      - Participants (X/Y)
      - Progress bar
      - Action buttons (start/spin/done/cancel/delete/edit)

  Scenario: Create a new round
    When I tap "New Round"
    Then I see a creation form
    When I fill in:
      | Field          | Value         |
      |----------------|---------------|
      | Name           | Round 500-1   |
      | Category       | 500 ETB       |
      | Amount         | 500           |
      | Frequency      | Daily         |
      | People Goal    | 10            |
      | Total Rounds   | 30            |
      | Commission     | 10%           |
    And I tap "ፍጠር / Create"
    Then I see the new round as "draft"
    And the round appears in the list

  Scenario: Edit a draft round
    Given a draft round exists
    When I tap "Edit" on the round
    Then I see pre-filled form
    When I change the name and tap "አዘምን / Update"
    Then the round name updates in the list

  Scenario: Cannot edit completed round
    Given a completed round exists
    When I view its details
    Then there is no "Edit" action
    (Or it returns a 422 error)

  Scenario: Delete a draft round
    Given a draft round with 0 participants
    When I tap "Delete"
    Then the round is removed from the list
    And it no longer exists in DB

  Scenario: Cannot delete active round
    Given an active round exists
    When I tap "Delete"
    Then I see "Cannot delete an active round. Cancel it first."
    And the round persists

  Scenario: Activate a full round
    Given a draft round with 10/10 participants
    When I tap "Start"
    Then the status changes to "active"
    And the start date is set

  Scenario: Cannot activate a non-full round
    Given a draft round with 3/10 participants
    When I tap "Start"
    Then I see "Goal not reached"
    And the status remains "draft"

  Scenario: Complete an active round
    Given an active round
    When I tap "Done"
    Then the status changes to "completed"
    And a next-cycle draft round is auto-created
    And the round shows an end date

  Scenario: Cancel a round
    Given a draft round
    When I tap "Cancel"
    Then the status changes to "cancelled"

  Scenario: Cannot complete a non-active round
    Given a cancelled round
    When I tap "Done"
    Then I see "Only active rounds can be completed"
```

### 9.2 Round Spin (Draw)

```
Feature: Round Spin / Draw
  As an admin
  I want to run a draw on a full round
  So that a winner is selected

  Scenario: Manual spin on full active round
    Given an active round with 10/10 participants
    When I tap "Spin" on the round
    Then I see a loading/spinning animation
    Then a winner is displayed
    And a draw record is created
    And the winner's slot has_won = true
    And the round's current_round_number advances

  Scenario: Spin with DiceShaker animation
    When I tap "Shake" (the unified jar)
    Then I see a dice-shaking animation
    Then a winner is announced
    And the privacy-first response hides the member name
    (Admin still sees the name for payout)

  Scenario: Cannot spin on non-full round
    Given an active round with 5/10 participants
    When I tap "Spin"
    Then I see "Goal not reached"
    And no draw occurs

  Scenario: Cannot spin on non-active round
    Given a draft round
    When I tap "Spin"
    Then I see "Round is not active"

  Scenario: No eligible slots
    Given all slots in an active round have has_won = true
    When I tap "Spin"
    Then I see "No eligible slots"
```

### 9.3 Demo Fill

```
Feature: Demo Fill
  As an admin
  I want to quickly fill a round with demo users
  So that I can test the round without real users

  Scenario: Demo-fill a draft round
    Given a draft round with people_goal = 10
    And there are only 2 existing users
    When I tap "Demo Fill"
    Then 8 demo users are created
    And the round reaches 10/10 participants
    And the round becomes active
    And a next-cycle draft is created

  Scenario: Cannot demo-fill a non-draft round
    Given an active round
    When I tap "Demo Fill"
    Then I see "Only draft rounds can be demo-filled"
```

### 9.4 Round Enroll / Unenroll

```
Feature: Round Enrollment
  As an admin (or member via self-service)
  I want to enroll and unenroll users in rounds
  So that I manage round membership

  Scenario: Admin enrolls a user
    Given a draft round exists
    When the admin selects a user and taps "Enroll"
    Then the user gets a slot in the round
    And the participant count increments

  Scenario: Self-enroll (member)
    Given I am a logged-in member
    And a draft round exists
    When I tap "Join Round"
    Then I am enrolled
    And the participant count increments

  Scenario: Enroll into a full round
    Given a round at 10/10 participants
    When I try to enroll
    Then I see "Round is full"

  Scenario: Double enrollment prevented
    Given I am already enrolled in a round
    When I try to enroll again
    Then I see "User already enrolled in this round"

  Scenario: Admin unenrolls a user
    Given a user is enrolled in a round
    When the admin taps "Unenroll"
    Then the user's round_id is set to null
    And the participant count decrements
```

---

## 10. Admin — Member Management

### 10.1 Member List & Details

```
Feature: Admin Member Management
  As an admin
  I want to view and manage members
  So that I maintain the member database

  Scenario: Members list loads
    Given there are 25 members
    When I navigate to the Members tab
    Then I see a paginated list of members
    And each member shows:
      - Name
      - Phone
      - Number of slots
      - Registration date
      - Action buttons (view details, call, SMS, deposit)

  Scenario: Search members
    When I type "Abebe" in the search box
    Then only members with "Abebe" in their name or phone are shown
    When I clear the search
    Then all members are shown again

  Scenario: Filter by category
    When I select "500 ETB" from the category filter
    Then only members with 500 ETB slots are shown

  Scenario: Pagination
    Given there are 25 members (2 pages)
    Then I see page 1 with 20 members
    When I click "Next"
    Then I see page 2 with 5 members

  Scenario: View member details modal
    When I tap "View" on a member
    Then I see the MemberDetailModal
    And I see:
      - Member name, phone, photo
      - All their slots with details
      - Payment history
      - Lien status
      - Total contributed amount

  Scenario: Call member
    When I tap "Call" on a member
    Then the browser opens `tel:0912345678`

  Scenario: SMS member
    When I tap "SMS" on a member
    Then the browser opens `sms:0912345678?body=...`

  Scenario: USSD deposit
    When I tap "Deposit via USSD"
    Then the browser opens `tel:*847*0912345678%23`
```

---

## 11. Admin — Draw & Payout Flows

### 11.1 Winners Tab

```
Feature: Admin Winners View
  As an admin
  I want to see all draws and payouts
  So that I audit the Equb

  Scenario: Winners list loads
    Given there are 15 draws
    When I navigate to the Winners tab
    Then I see paginated draw records
    And each draw shows:
      - Spin ID
      - Round number
      - Category
      - Winner name
      - Slot number
      - Net payout
      - Commission
      - Total collected
      - Draw date

  Scenario: Filter winners by category
    When I select "1000 ETB" in the filter
    Then only winners from 1000 ETB draws are shown

  Scenario: Filter winners by round
    When I enter round number "3"
    Then only winners from round 3 are shown
```

### 11.2 Payout Processing

```
Feature: Admin Payout
  As an admin
  I want to process payouts to winners
  So that winners receive their funds

  Scenario: Process payout with correct PIN
    Given a draw record exists
    When I tap "Payout" on the draw
    And I enter the payout PIN "123456"
    And I confirm
    Then I see "Payout successful"
    And a PaymentLog record is created
    And the payout status is "success"

  Scenario: Wrong payout PIN
    When I enter incorrect PIN
    Then I see "Wrong password"
    And no PaymentLog is created

  Scenario: View payout receipt
    Given a payout has been processed
    When I view the draw details
    Then I see the payout reference and gateway (Telebirr)
```

---

## 12. Admin — Promo Code Management

### 12.1 Promo CRUD

```
Feature: Admin Promo Code Management
  As an admin
  I want to manage broker promo codes
  So that I can track referrals

  Scenario: Promo codes list
    Given there are 3 promo codes
    When I navigate to the Promo tab
    Then I see all promo codes with:
      - Code
      - Broker name
      - Broker phone
      - Commission rate
      - Total registrations
      - Total earned
      - Status (active/inactive)

  Scenario: Create a promo code
    When I tap "New Promo"
    And I fill in:
      | Field        | Value          |
      |--------------|----------------|
      | Broker Name  | Solomon A.     |
      | Broker Phone | 0911111111     |
      | Commission   | 5%             |
    And I tap "ፍጠር / Create"
    Then a new promo code is created
    And the code starts with "PROMO-"
    And it appears in the list with status "active"

  Scenario: Promo stats
    Then I see stats:
      - Total brokers
      - Active brokers
      - Total registrations
      - Total paid out
      - Registrations today

  Scenario: Validate promo code publicly
    Given an active promo code "PROMO-TEST"
    When I call POST /api/promo/validate with code "PROMO-TEST"
    Then I get { valid: true, promo_code: {...} }

  Scenario: Validate inactive promo code
    Given an inactive promo code
    When I validate it
    Then I get { valid: false }

  Scenario: Validate non-existent code
    When I validate "NONEXISTENT"
    Then I get { valid: false }
```

---

## 13. Admin — Payment Monitoring

### 13.1 Payment Logs

```
Feature: Admin Payment Monitoring
  As an admin
  I want to view all payment transactions
  So that I monitor member contributions

  Scenario: Payment logs list
    Given there are 50 payment logs
    When I navigate to the Payments tab
    Then I see paginated payment records
    And each record shows:
      - User name
      - Amount
      - Status (success/failed)
      - Payment gateway
      - Transaction reference
      - Date

  Scenario: Filter by status
    When I select "Paid" filter
    Then only successful payments are shown
    When I select "Failed" filter
    Then only failed payments are shown

  Scenario: Payment receipt view
    When I tap on a payment record
    Then I see the full receipt details
    Including member name, amount, date, method
```

---

## 14. Admin — SMS Logs & Notifications

### 14.1 SMS Logs

```
Feature: SMS Log View
  As an admin
  I want to view sent SMS messages
  So that I audit communication

  Scenario: SMS logs load
    Given there are 20 SMS logs
    When I navigate to the SMS tab
    Then I see paginated SMS records
    And each record shows:
      - Recipient phone
      - Message type
      - Message preview
      - Sent date

  Scenario: View full message
    When I tap on an SMS log entry
    Then I see the full message content
```

### 14.2 Desktop Layout

```
Feature: Admin Desktop Layout (≥1024px width)
  As an admin on desktop
  I want a proper sidebar layout
  So that I navigate efficiently

  Scenario: Desktop viewport shows sidebar
    When the viewport is ≥1024px wide
    Then I see a sidebar with:
      - Gojo Equb logo
      - "MAIN" section: Overview, Members
      - "MANAGE" section: Winners, Payments, Rounds, Promo
      - Logout button
    And a top header bar with:
      - Current page title
      - Search input
      - Notification bell
      - Language switcher
      - Lock/unlock toggle
    And the main content area beside the sidebar

  Scenario: Mobile viewport shows bottom tabs
    When the viewport is <1024px wide
    Then I see bottom tab navigation
    And tabs are horizontally scrollable
```

---

## 15. Category & Tier Configuration

### 15.1 Category CRUD (Admin)

```
Feature: Admin Category Management
  As an admin
  I want to manage Equb categories/tiers
  So that I configure the product offerings

  Scenario: List categories
    Given there are 5 categories
    When I navigate to the category management
    Then I see all categories sorted by sort_order
    And each shows: code, label (EN/AM), amount, frequency, max_members, status

  Scenario: Create a new category
    When I create a category with:
      | Field           | Value                  |
      |-----------------|------------------------|
      | Code            | 3000                   |
      | Label (EN)      | 3000 ETB Platinum      |
      | Label (AM)      | 3000 ብር ፕላቲነም         |
      | Amount          | 3000                   |
      | Frequency       | Daily                  |
      | Max Members     | 20                     |
      | Total Rounds    | 30                     |
      | Collateral Type | salary_withholding     |
    Then the category is created
    And a CategoryConfigurationChanged event fires

  Scenario: Update category
    When I update a category's max_members from 10 to 25
    Then the category updates
    And associated rounds get cascaded metadata

  Scenario: Cascade update to active rounds
    When I update a category with propagate_to_rounds = true
    Then all active/draft rounds with that code get updated
    (amount, max_members propagate to rounds)

  Scenario: Delete category without active rounds
    Given a category with 0 active rounds
    When I delete it
    Then the category is removed

  Scenario: Cannot delete category with active rounds
    Given a category with 2 active/draft rounds
    When I delete it
    Then I see "Cannot delete category. 2 round(s) still active."
```

### 15.2 Public Tiers Display

```
Feature: Public Tier Display
  As a visitor
  I want to see the Equb tiers
  So that I choose my savings level

  Scenario: Tiers endpoint returns correct structure
    When I call GET /api/tiers
    Then I receive 4 tiers (500, 1000, 2000, 5000)
    And each has: code, label, target, amount, total_slots,
                 current_round, current_count, is_full, percentage
    And active_rounds are included
```

---

## 16. Language & Internationalisation

### 16.1 Bilingual UI

```
Feature: Amharic / English Language Toggle
  As a user
  I want to switch between Amharic and English
  So that I use the app in my preferred language

  Scenario: Toggle from English to Amharic
    Given I am on the Landing page in English
    When I tap the language toggle (EN → አማ)
    Then all UI text changes to Amharic
    And the toggle now shows "EN"

  Scenario: Toggle from Amharic to English
    Given I am in Amharic mode
    When I tap the toggle (አማ → EN)
    Then all UI text changes to English
    And the toggle now shows "አማ"

  Scenario: Language persists across pages
    When I switch to Amharic on the Landing page
    And I navigate to Login
    Then Login page is also in Amharic

  Scenario: Language persists in storage
    When I switch to Amharic
    And I close and reopen the app
    Then the language remains Amharic

  Scenario: Admin dashboard bilingual
    Given I am an admin
    When I toggle the language
    Then all admin tabs switch language
    (member labels, round status, stat labels all update)
```

---

## 17. Security & Edge Cases

### 17.1 Auth & Access Control

```
Feature: Security & Access Control
  As the system
  I want to enforce authentication and authorisation
  So that only authorised users access protected resources

  Scenario: Unauthenticated access to /api/me returns 401
    When I call GET /api/me without a token
    Then I receive 401

  Scenario: Unauthenticated access to /api/admin/* returns 401
    When I call any /api/admin/* route without a token
    Then I receive 401

  Scenario: Non-admin access to /api/admin/* returns 403
    Given I am a member (not admin)
    When I call POST /api/admin/rounds
    Then I receive 403

  Scenario: XSS prevention — name contains script tag
    When I register with name "<script>alert('xss')</script>"
    Then the name is stored safely
    And the page does not execute the script
    And the dashboard displays the literal name text

  Scenario: SQL injection in phone
    When I try to login with phone "' OR 1=1 --"
    And password "anything"
    Then I receive 401 (invalid credentials)
    And no SQL injection occurs

  Scenario: Rate limiting on login
    When I attempt login 6 times in 1 minute
    Then the 6th attempt returns 429 (Too Many Requests)
    And I see "Too many attempts"

  Scenario: Token expiry
    Given my token is expired
    When I call an authenticated endpoint
    Then I receive 401

  Scenario: Excessive payload in registration
    When I register with a 10MB payload
    Then I receive 413 (Payload Too Large) or the request is rejected
```

### 17.2 Data Integrity

```
Feature: Data Integrity
  As the system
  I want to prevent data corruption
  So that the Equb ledger remains accurate

  Scenario: Double spin prevention
    Given a draw was just run on a round
    When I immediately call spin again
    Then the same slot cannot be selected twice
    (has_won flag prevents re-selection)

  Scenario: Concurrency — two draws at once
    When two spin requests arrive simultaneously
    Then the DB transaction lock prevents the same slot being picked
    And exactly one winner is recorded

  Scenario: Round participant count consistency
    Given a round with 10 participants
    When I unenroll a member
    Then the count becomes 9
    When I enroll a new member (different user)
    Then the count becomes 10

  Scenario: Balance consistency
    Given a member has made 5 payments of 500 ETB each
    Then their slot balance is exactly 2500 ETB
```

---

## 18. Performance & Thresholds

### 18.1 Page Load & Interaction Benchmarks

```
Feature: Performance Benchmarks
  As a user
  I want the app to feel responsive
  So that I have a good experience

  Scenario: Landing page loads under 3 seconds
    When I navigate to the Landing page
    Then the page is fully interactive in < 3000ms
    And the spinning jar animation starts in < 2000ms

  Scenario: Login completes under 2 seconds
    When I submit login credentials
    Then the dashboard appears in < 2000ms

  Scenario: Admin overview loads under 3 seconds
    Given I am an admin
    When I navigate to the Overview tab
    Then all stat cards render in < 3000ms

  Scenario: Round list renders quickly with 50 rounds
    Given there are 50 rounds
    When I navigate to the Rounds tab
    Then the list renders in < 4000ms

  Scenario: Members list pagination
    Given there are 100 members
    When I navigate to the Members tab
    Then page 1 loads in < 3000ms
    And page 2 loads in < 2000ms
```

### 18.2 Error Handling & Resilience

```
Feature: Error Handling
  As a user
  I want graceful error messages
  So that I understand what went wrong

  Scenario: Backend down shows retry screen
    When the backend is unreachable
    Then I see "Unable to connect" with a "Retry" button
    When I tap "Retry" and the backend is back up
    Then the app continues normally

  Scenario: Network timeout
    When a request takes > 30 seconds
    Then I see "Request timed out" with retry option

  Scenario: API validation errors shown on form
    When I submit invalid form data
    Then each field shows its specific error message
    And the form is not submitted
```

---

## 19. CI/CD Integration

### 19.1 GitHub Actions Workflow

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      sqlite:
        image: nouchka/sqlite3:latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - uses: actions/setup-php@v4
        with:
          php-version: 8.4
          extensions: sqlite, mbstring, xml, json

      - name: Install backend deps
        run: cd backend && composer install --no-interaction

      - name: Install frontend deps
        run: cd mobile-app && npm ci

      - name: Install Playwright
        run: cd e2e && npx playwright install --with-deps chromium

      - name: Start backend test server
        run: |
          cd backend
          cp .env.testing .env
          php artisan serve --env=testing --port=8000 &
          sleep 3

      - name: Start Expo web
        run: |
          cd mobile-app
          npx expo export --platform web --output-dir dist
          npx serve dist -p 8081 &
          sleep 3

      - name: Run E2E tests
        run: cd e2e && npx playwright test

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: e2e/reports/
```

### 19.2 Pre-commit Hook

A `husky` pre-commit hook runs:
1. `npx playwright test --grep @smoke` (critical 10 tests only)
2. If any @smoke test fails → commit blocked

---

## 20. Appendix — Page Object Classes

### 20.1 LandingPage (`pages/LandingPage.ts`)

```typescript
export class LandingPage {
  constructor(public page: Page) {}

  // Locators
  logo = () => this.page.locator('[data-testid="equb-logo"]')
  signUpBtn = () => this.page.locator('text=ለመጀመር').or(this.page.locator('text=Sign Up'))
  loginBtn = () => this.page.locator('text=ግባ').or(this.page.locator('text=Sign In'))
  spinningJar = () => this.page.locator('[data-testid="spinning-jar"]')
  tierCards = () => this.page.locator('[data-testid="tier-card"]')
  tierCard = (code: string) => this.page.locator(`[data-testid="tier-card-${code}"]`)
  activeRoundsSection = () => this.page.locator('[data-testid="active-rounds"]')
  recentWinnersSection = () => this.page.locator('[data-testid="recent-winners"]')

  // Bottom tabs
  homeTab = () => this.page.locator('text=መነሻ').or(this.page.locator('text=Home'))
  dashboardTab = () => this.page.locator('text=ሰንጠረዥ').or(this.page.locator('text=Dashboard'))
  othersTab = () => this.page.locator('text=ሌሎች').or(this.page.locator('text=Others'))

  // Actions
  async goto() { await this.page.goto('/') }
  async clickSignUp() { await this.signUpBtn().click() }
  async clickLogin() { await this.loginBtn().click() }
  async switchLanguage() {
    await this.page.locator('[data-testid="lang-toggle"]').click()
  }
}
```

### 20.2 LoginPage (`pages/LoginPage.ts`)

```typescript
export class LoginPage {
  constructor(public page: Page) {}

  phoneInput = () => this.page.locator('[data-testid="phone-input"]')
  passwordInput = () => this.page.locator('[data-testid="password-input"]')
  submitBtn = () => this.page.locator('text=ግባ').or(this.page.locator('text=Sign In'))
  errorMessage = () => this.page.locator('[data-testid="auth-error"]')
  forgotPasswordLink = () => this.page.locator('text=ረሳሁት').or(this.page.locator('text=Forgot'))

  async login(phone: string, password: string) {
    await this.phoneInput().fill(phone)
    await this.passwordInput().fill(password)
    await this.submitBtn().click()
  }
}
```

### 20.3 AdminDashboardPage (`pages/AdminDashboardPage.ts`)

```typescript
export class AdminDashboardPage {
  constructor(public page: Page) {}

  // Desktop sidebar
  sidebar = () => this.page.locator('[data-testid="admin-sidebar"]')
  sidebarTab = (name: string) =>
    this.page.locator(`[data-testid="sidebar-tab-${name}"]`)

  // Mobile bottom bar
  bottomTab = (name: string) =>
    this.page.locator(`[data-testid="bottom-tab-${name}"]`)

  // Top header (desktop)
  searchInput = () => this.page.locator('[data-testid="admin-search"]')
  notificationBtn = () => this.page.locator('[data-testid="notif-btn"]')
  langToggle = () => this.page.locator('[data-testid="lang-toggle"]')
  lockToggle = () => this.page.locator('[data-testid="lock-toggle"]')

  // Overview stats
  statCard = (label: string) =>
    this.page.locator(`[data-testid="stat-${label}"]`)

  // Actions
  async navigateToTab(tab: string) {
    const isDesktop = await this.page.evaluate(() => window.innerWidth >= 1024)
    if (isDesktop) {
      await this.sidebarTab(tab).click()
    } else {
      await this.bottomTab(tab).click()
    }
  }
}
```

### 20.4 RoundsPage (`pages/RoundsPage.ts`)

```typescript
export class RoundsPage {
  constructor(public page: Page) {}

  newRoundBtn = () => this.page.locator('text=New Round')
  roundCard = (id: number) => this.page.locator(`[data-testid="round-card-${id}"]`)
  roundName = () => this.page.locator('[data-testid="round-name-input"]')
  roundCategory = () => this.page.locator('[data-testid="round-category-select"]')
  roundStatusBadge = (id: number) =>
    this.page.locator(`[data-testid="round-status-${id}"]`)
  spinBtn = () => this.page.locator('text=Spin')
  startBtn = () => this.page.locator('text=Start')
  doneBtn = () => this.page.locator('text=Done')
  cancelBtn = () => this.page.locator('text=Cancel')
  deleteBtn = () => this.page.locator('text=Delete')
  editBtn = () => this.page.locator('text=Edit')

  async createRound(data: {
    name: string, category: string, amount: number,
    frequency: string, peopleGoal: number, totalRounds: number
  }) { /* form fill + submit */ }

  async spinRound(id: number) {
    await this.roundCard(id).locator('text=Spin').click()
  }
}
```

---

## Summary

| Layer | Test Count Estimate | Scope |
|-------|-------------------|-------|
| 🔬 Auth & Registration | ~18 tests | Signup, login, logout, password reset |
| 🏠 Landing & Portal | ~10 tests | Tiers, rounds, winners, navigation |
| 📊 Member Dashboard | ~15 tests | Slots, payments, receipts, statements |
| 💰 Savings | ~8 tests | Deposit, withdraw, statements |
| 🔐 Admin Gate | ~5 tests | PIN, retry, cancel |
| 📈 Admin Overview | ~8 tests | Stats, by-category, risk |
| 🔄 Rounds | ~20 tests | CRUD, spin, demo-fill, enroll |
| 👥 Members | ~8 tests | List, search, filter, detail modal |
| 🏆 Draws & Payouts | ~10 tests | Spin, shake, payout, PIN |
| 📋 Promo | ~8 tests | CRUD, validate, stats |
| 💳 Payments | ~6 tests | Logs, filters, receipts |
| 🌐 i18n | ~6 tests | Toggle, persistence, all pages |
| 🔒 Security | ~10 tests | Auth, XSS, SQLi, rate limit, concurrency |
| ⚡ Performance | ~6 tests | Page load, API response time |
| **Total** | **~138 tests** | Full end-to-end coverage |

---

> **Next Steps:**
> 1. Install Playwright: `cd e2e && npm init playwright@latest`
> 2. Implement the `ApiClient` helper for test data setup
> 3. Build Page Objects following the `pages/` structure above
> 4. Write specs starting with the `@smoke` critical path (Auth → Dashboard → Round management)
> 5. Set up CI with the GitHub Actions workflow
> 6. Run full suite and triage flaky tests
