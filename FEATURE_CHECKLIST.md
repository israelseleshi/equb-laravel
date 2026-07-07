# Equb App — Feature Checklist

> TypeScript/Expo rebuild vs. original React Native `equbapp`
>
> **Status key:** ✅ Done | 🚧 Partial | ❌ Missing

---

## 1. Navigation & Shell

- [ ] **MainScreen (3-tab shell)** — The original wraps everything in a `MainScreen` with 3 pill tabs (Public Portal / Members Dashboard / Terminal Summary) plus a Galileo-style nav bar with logo, brand title, tour button, and language toggle. **Nothing like this exists — our rebuild has no top-level tab shell.**
- [ ] **Footer** — Copyright ("© 2026 Zoe Automotive PLC") + regulatory text ("Regulated Under Digital Joint Syndicate Division") bilingual. **Missing.**
- [ ] **Tour system** — `TourContext` provider + `TourOverlay` modal (cutout, step counter, navigation) + `TourTarget` wrappers. Two tours: Portal (5 steps) + Dashboard (5 steps). Persistence via AsyncStorage. **Entirely missing.**

### Sub-tasks

- Create `src/context/TourContext.tsx` with provider, state, targets store, scroll offset tracking
- Create `src/components/TourTarget.tsx` — layout-measuring wrapper that registers targets
- Create `src/components/TourOverlay.tsx` — modal overlay with cutout window, step counter, prev/next/skip
- Create `src/navigation/MainScreen.tsx` — top-level shell with 3-tab nav bar, language toggle, tour button, footer
- Replace single-screen routing in `App.tsx` with MainScreen as root container
- Define 2 tour step configs (portal + dashboard) in `src/data/tourSteps.ts`
- Persist tour completion in AsyncStorage

---

## 2. Authentication

- [x] **Login (phone + password)** — Basic credential check for member (0907082821 / 12345678) and admin (0920190438 / 87654321). **Done in `LoginScreen.tsx`.**
- [ ] **Admin 2-step passcode** — Original has a separate `AuthGate` component: after password, admin enters 6-digit passcode (`1234`) with lockout after `MAX_FAILED_ATTEMPTS`. Our rebuild has no 2FA gate.
- [x] **App lock/unlock toggle** — `AdminDashboardScreen.tsx` Security tab has a lock toggle. **Done (basic).**
- [ ] **Session persistence** — Original stores session + lock state in AsyncStorage (`@miniequb_session`, `@miniequb_lock_state`) so state survives app restart. **Missing.**

### Sub-tasks

- Create `src/components/AuthGate.tsx` — passcode PIN screen with lockout countdown timer
- Add `@react-native-async-storage/async-storage` dependency
- Create `src/services/storage.ts` — session persistence (store/restore user, lock state)
- Wire AuthGate into navigation flow for admin login

---

## 3. Public Portal / Landing Page

- [x] **Welcome header** — Avatar, name, stats cards. **Done in `DashboardScreen.tsx`.**
- [x] **Tier cards (2×2 grid)** — 500 / 1,000 / 2,000 / 5,000 ETB with round badge, progress bar, Open/Full status. **Done in `DashboardScreen.tsx`.** *(Note: original uses 100 / 500 / 2000 + Savings; ours uses 500 / 1000 / 2000 / 5000.)*
- [x] **Spin wheel** — Animated SVG wheel with colored segments, slot-number labels, red pointer, 3s ease-out animation. **Done in `DashboardScreen.tsx`.** *(Original has 10 sectors for 1-1000 range; ours has 6 slots.)*
- [x] **Winner history** — Table with date, slot, amount rows per tier. **Done.**
- [ ] **Idle state ("No Draw Result")** — When no winner, show "Waiting for admin to perform the 11:00 draw" message. **Missing.**
- [ ] **Draw results below wheel** — The original shows the winning slot, amount, round, and timestamp in a result card below the wheel immediately after spin. Our wheel doesn't show a result card inline.

### Sub-tasks

- Add "No Draw Result" idle state to spin wheel
- Add inline draw result card below wheel after spin completes

---

## 4. Member Dashboard (Full)

> Complete rewrite completed — all 14 original member dashboard sections replicated with premium visual upgrades.

- [x] **Welcome header** — Avatar, name, stats cards. **Done.**
- [x] **Slot switcher** — Horizontal pill tabs to switch between slots. **Done.**
- [x] **Notification bar** — Dynamic color-coded alerts: due today (yellow), missed (red), all complete (green), winner (amber). **Done.**
- [x] **Member info card** — Avatar gradient, name, ID, phone, status pill, meta row. **Done.**
- [x] **Progress bar** — Animated bar + 4 stats (days paid, remaining, paid ETB, remaining ETB). **Done.**
- [x] **Action buttons row** — Recent Payments / Withdraw / Help / Lock. **Done.**
- [x] **Daily Save section** — Balance display, deposit/withdraw, transaction history. **Done.**
- [x] **Filter tabs** — All / Unpaid / Paid pill filters. **Done.**
- [x] **Payment cards** — Per-day cards with formatted date, amount, status badge, Pay Now, Receipt. **Done.**
- [x] **Batch pay** — Checkboxes on unpaid cards + bottom bar with total + Pay Selected. **Done.**
- [x] **USSD payment modal** — 4-step flow (dial → PIN → processing → success). **Done.**
- [x] **Receipt modal + PDF** — Card overlay with all fields + PDF download via expo-print. **Done.**
- [x] **Recent payments modal** — Last 50 payments, reverse chronological. **Done.**
- [x] **Transaction history modal** — Deposits (green) and withdrawals (red). **Done.**
- [x] **Withdrawal modal** — Confirmation with amount, commission, net. **Done.**
- [x] **Spin wheel** — Animated SVG with colored segments, pointer, winner result. **Done.**
- [x] **Winner history table** — Date, slot, amount rows. **Done.**
- [x] **Register Member CTA card** — **Done.**
- [x] **Logout footer** — Destructive red button. **Done.**

---

## 5. Admin Dashboard

- [x] **Overview** — 4 stat cards, By Category breakdown, Risk Status. **Done.**
- [x] **Members** — Search, category filter chips, member cards with avatar/name/phone, slot badges, Call/Deposit/Lien actions. **Done.**
- [x] **Winners** — Category + round filter chips, winner cards, Telebirr payout modal (dial → PIN → processing → success). **Done.**
- [x] **Payments** — Payment Log (list with all/paid/unpaid filter) + Today's Status (per-member green/red dots, Call & Send USSD). **Done.**
- [x] **Rounds** — Per-category progress bars, Lucky Spin button, Daily Savings card, manual payout modal (member picker + amount). **Done.**
- [x] **Security** — Lock/unlock badge with toggle button. **Done.**
- [ ] **Member detail modal** — Original admin can tap a member to see full details, edit, manage slots. **Missing.**
- [ ] **Slot management** — Admin can create/assign/reassign slots. **Missing.**
- [ ] **SMS log** — Admin can see sent SMS history. **Missing.**

### Sub-tasks

- Add member detail modal (view/edit member info, manage slots)
- Add slot management UI (create, assign to user, change status)
- Add SMS log viewer tab or section

---

## 6. Registration (Onboarding Wizard)

> Entirely missing. The original has a 1167-line 5-step wizard.

- [ ] **Step 0: Welcome/Start** — "Welcome to Miniዕቁቤ" with description + "Start Registration" button.
- [ ] **Step 1: National ID (Fayda)** — 12-digit Fayda ID input → verify (800ms) → OTP sent to phone → 4-digit OTP (`4921`) → auto-advance.
- [ ] **Step 2: Create Account** — Full Name, Phone, Password, Confirm Password with validation.
- [ ] **Step 3: Documents & Photos** — National ID photo capture via CameraView (front/back toggle, guide frame), Work Address input, Category selection (500/1000/2000/savings radio cards), Daily Savings amount (min 10 ETB, for savings category only), Registered Phone info card.
- [ ] **Step 4: Agreement & Signature** — Savings summary box, scrollable Terms & Conditions (bilingual Amharic legal text), acceptance checkbox, SignaturePad (finger-drawn SVG via PanResponder).
- [ ] **Step 5: Registration Success + Payment** — Registration summary (name, phone, category, slot #, reg ID), "Pay Now" button → inline USSD flow (same 4-step), Payment Success screen, "Download Receipt PDF" button, "Go to Dashboard" button.
- [ ] **PDF Generation** — Comprehensive legal PDF: personal info, registration info, payment info, withdrawal eligibility, terms & conditions, digital signature, legal footer. Multi-platform (web Blob + native Sharing).

### Sub-tasks

- Create `src/screens/OnboardingWizardScreen.tsx` with 5-step flow
- Create `src/components/SignaturePad.tsx` — PanResponder-based SVG signature capture
- Create `src/components/CameraCapture.tsx` — expo-camera overlay with guide frame
- Create `src/components/UssdFlow.tsx` — reusable inline USSD 4-step flow
- Create `src/services/PdfService.ts` — PDF generation via expo-print
- Create `src/data/legalTerms.ts` — bilingual terms text
- Add expo-camera and expo-print dependencies

---

## 7. Data & Persistence

> Entirely missing. The original uses AsyncStorage with 8 collections and 5 data models.

- [ ] **Storage service** — AsyncStorage CRUD for all collections. Read-all-then-modify-then-write pattern.
- [ ] **5 Data Models:**
  - `UserModel` — id, name, phone, password, paymentGateway, signature, registrationDate
  - `SlotModel` — id, userId, category, slotNumber, balance, status, hasWon, dealClosed, uniquePaymentCode, payoutCode, depositedToday, consecutiveMissedSweeps
  - `DrawRecordModel` — round, spinId, timestamp, winningSlot, winnerName, netPayout, category
  - `SmsLogModel` — id, recipient, type, message, timestamp
  - `PaymentLogModel` — id, userId, userName, amount, status, timestamp, paymentGateway
- [ ] **Payment Schedules** — Generate per-slot schedule with day-by-day payment records.
- [ ] **Savings Accounts** — Per-slot savings with balance tracking.
- [ ] **Seed data management** — First-run seeding of demo users, slots, draws.
- [ ] **Session + lock state persistence** — Store/restore on app restart.

### Sub-tasks

- Create `src/data/models.ts` — TypeScript interfaces + factory functions
- Create `src/services/storage.ts` — AsyncStorage wrapper for all 8 collections
- Create `src/services/scheduleService.ts` — payment schedule generation
- Create `src/services/seedService.ts` — first-run data seeding
- Create `src/context/AuthContext.tsx` — session management with persistence

---

## 8. Tier Configuration

- [x] **Basic tier config** — 500/1000/2000/5000 ETB with target, bar color, label. **Done in `src/data/tierConfig.ts`.**
- [ ] **ROUND_ONE vs DEFAULT_CONFIG** — Original has a `getCategoryRound()` function that detects if slots were registered within the last 30 days and returns round 1 config (smaller targets: 50 slots) vs round 2+ config (full targets: 400-600 slots). **Missing — our config is static.**
- [ ] **100 ETB tier** — Original has a 100 ETB tier (daily 100, target 50/600). **Missing — we only have 500/1000/2000/5000.**
- [ ] **Savings category** — Original has `savings` in `CATEGORY_CODES` with special handling everywhere. We added savings in Rounds tab but it's not integrated into the full data model.

### Sub-tasks

- Add `getCategoryRound()` logic to `tierConfig.ts`
- Add 100 ETB tier to config and UI
- Integrate `savings` category across data models

---

## 9. Components Library

- [x] **Card** — Reusable Card component. **Done.**
- [x] **Button** — Reusable Button (primary/secondary/outline/ghost). **Done.**
- [x] **SpinWheel** — SVG wheel with sectors, pointer, center hub, animated rotation. **Done (6-slot animated in DashboardScreen).**
- [x] **UssdFlow** — Inline 4-step USSD payment flow (dial → PIN → processing → success). **Done (in DashboardScreen).**
- [x] **ReceiptCard** — Payment receipt display component. **Done (in DashboardScreen).**
- [x] **PaymentCard** — Day payment card with date, amount, status, actions. **Done (in DashboardScreen).**
- [x] **ProgressBar** — Animated progress bar with label. **Done (in DashboardScreen).**
- [x] **NotificationBar** — Color-coded alert bar. **Done (in DashboardScreen).**
- [x] **Avatar** — User avatar circle with initial. **Done (inline in dashboards).**
- [ ] **SignaturePad** — PanResponder-based finger drawing, SVG output, onSave/onClear. **Missing.**
- [ ] **TourOverlay** — Modal overlay with cutout window, step counter, navigation. **Missing.**
- [ ] **TourTarget** — Layout-measuring wrapper. **Missing.**
- [ ] **CameraCapture** — expo-camera overlay with guide frame. **Missing.**

### Sub-tasks

- Refactor SpinWheel into reusable `src/components/SpinWheel.tsx` (configurable sectors, colors, size)
- Create all missing components as reusable files in `src/components/`

---

## Summary

| Area | Done | Partial | Missing |
|------|------|---------|---------|
| Navigation & Shell | 0 | 0 | 3 |
| Authentication | 1 | 1 | 1 |
| Public Portal | 4 | 0 | 2 |
| Member Dashboard | 18 | 0 | 0 |
| Admin Dashboard | 6 | 0 | 3 |
| Registration | 0 | 0 | 6 |
| Data & Persistence | 0 | 0 | 6 |
| Tier Config | 1 | 0 | 3 |
| Components | 9 | 0 | 4 |
| **Total** | **39** | **1** | **28** |

### Priority Build Order

1. **Data & Persistence** (foundation — everything else depends on it)
2. **Onboarding Wizard** (5-step registration flow)
3. **Navigation Shell** (MainScreen with 3 tabs, footer, tour system)
4. **Auth Enhancements** (2FA passcode gate, session persistence)
5. **Admin Extras** (member detail modal, slot management, SMS log)
6. **Tier Config** (ROUND_ONE mode, 100 ETB tier, savings integration)
7. **Components Library** (refactor shared components)
