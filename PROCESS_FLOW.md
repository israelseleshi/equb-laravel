# 🏛️ Gojo Equb — Complete Platform Process Flow

> **A Digital Equb Savings & Credit Platform**  
> *"Your trusted savings companion"*

---

## 📑 Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Member Process Flow](#2-member-process-flow)
3. [Admin Process Flow](#3-admin-process-flow)
4. [Draw & Winner Process Flow](#4-draw--winner-process-flow)
5. [Financial Transaction Flows](#5-financial-transaction-flows)
6. [Alternative & Edge Case Flow](#6-alternative--edge-case-flow)
7. [Data Table Map](#7-data-table-map)
8. [API Endpoint Reference](#8-api-endpoint-reference)

---

## 1. Platform Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   GOJO EQUB PLATFORM                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐     ┌────────────────────────┐    │
│  │                  │     │                        │    │
│  │   MOBILE APP     │     │   LARAVEL BACKEND      │    │
│  │   (React Native) │────▶│   (PHP 8.4)           │    │
│  │                  │     │                        │    │
│  │  • Member UI     │     │  • API Controllers     │     │
│  │  • Admin UI      │     │  • Eloquent Models    │     │
│  │  • Portal View   │◀────│  • Sanctum Auth       │     │
│  │  • SpinWheel     │     │  • Draw Engine        │     │
│  │  • DiceShaker    │     │  • SMS Service        │     │
│  └──────────────────┘     └──────────┬─────────────┘     │
│                                       │                   │
│                              ┌────────▼────────┐        │
│                              │                  │        │
│                              │    SQLite DB     │        │
│                              │  (Production →   │        │
│                              │   cPanel MySQL)  │        │
│                              │                  │        │
│                              └──────────────────┘        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### User Roles

| Role | Description | Access Level |
|------|-------------|-------------|
| 👤 **Member** | End user who saves money and participates in draws | Self-service dashboard + Portal |
| 🛡️ **Admin** | Platform operator who manages rounds, members, payouts | Full admin dashboard |
| 🏠 **Visitor** | Unauthenticated user browsing the landing page | Public pages only |

---

## 2. Member Process Flow

### 2.1 Registration & Onboarding

```
                    ┌─────────────────────┐
                    │   LANDING PAGE      │
                    │  (Portal View)      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  "Join Gojo Equb"   │
                    │   Registration      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Enter Details:     │
                    │  • Name             │
                    │  • Phone            │
                    │  • Password         │
                    │  • Category (tier)  │
                    │  • Promo Code (opt) │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  API: POST /register│
                    │  ─────────────────  │
                    │  1. Create user     │
                    │  2. Create slot     │
                    │  3. Return token    │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  AUTHENTICATED      │
                    │  • Token stored     │
                    │  • Session saved    │
                    │  • Redirect to      │
                    │    Dashboard        │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  MEMBER DASHBOARD   │
                    │  • Payment schedule │
                    │  • Savings wallet   │
                    │  • Slot info        │
                    └─────────────────────┘
```

**Alternative Paths:**
- ❌ **Invalid promo code** → Registration still succeeds, just without broker tracking
- ❌ **Duplicate phone** → Returns error: "Phone already registered"
- ❌ **Network failure** → Falls back to local storage for offline use

### 2.2 Daily Payment Flow

```
                    ┌─────────────────────────┐
                    │   MEMBER DASHBOARD       │
                    │  ┌───────────────────┐   │
                    │  │ Payment Schedule   │   │
                    │  │ ┌─────┬──────────┐ │   │
                    │  │ │Date │  Amount  │ │   │
                    │  │ ├─────┼──────────┤ │   │
                    │  │ │Jun1 │ 500 ETB  │ │   │
                    │  │ │Jun2 │ 500 ETB  │◀──│─── PENDING (unpaid)
                    │  │ │Jun3 │ 500 ETB  │ │   │
                    │  │ └─────┴──────────┘ │   │
                    │  └───────────────────┘   │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │   SELECT DAY(S) TO PAY  │
                    │                          │
                    │   ┌──────────────────┐   │
                    │   │ ☑ June 2 - 500   │   │
                    │   │ ☐ June 3 - 500   │   │
                    │   │ ☐ June 4 - 500   │   │
                    │   │                   │   │
                    │   │  [ PAY SELECTED ] │   │
                    │   └──────────────────┘   │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │   USSD PAYMENT MODAL     │
                    │                          │
                    │   Step 1: Dialing...     │
                    │   *847*123#              │
                    │   Total: 500 ETB         │
                    │                          │
                    │   Step 2: Enter PIN      │
                    │   [____]                 │
                    │                          │
                    │   Step 3: Processing...  │
                    │                          │
                    │   Step 4: ✅ SUCCESS     │
                    └──────────┬──────────────┘
                               │
               ┌───────────────┼───────────────┐
               │               │               │
               ▼               ▼               ▼
       ┌────────────┐  ┌────────────┐  ┌────────────┐
       │API: POST   │  │Schedule    │  │Receipt PDF │
       │/payments/  │  │updated in  │  │generated   │
       │pay         │  │local store │  │for records │
       └────────────┘  └────────────┘  └────────────┘
```

**Alternative Paths:**
- ❌ **Wrong USSD PIN** → Error shown, retry option
- ❌ **API unavailable** → Payment recorded locally, synced later
- ✅ **Batch payment** → Select multiple days, pay at once

### 2.3 Member Savings Flow

```
                    ┌─────────────────────────┐
                    │  SAVINGS CARD (if slot   │
                    │  is "savings" category)  │
                    │                          │
                    │  Balance: 2,500 ETB      │
                    │  Deposits: 3,000 ETB     │
                    │  Withdrawn: 500 ETB      │
                    │                          │
                    │  [DEPOSIT] [WITHDRAW]   │
                    └──────────┬──────────────┘
                               │
               ┌───────────────┴───────────────┐
               │                               │
               ▼                               ▼
       ┌─────────────────┐          ┌─────────────────┐
       │   DEPOSIT        │          │   WITHDRAW       │
       │                  │          │                  │
       │  Enter amount:   │          │  Confirm?        │
       │  [____]          │          │  Amount: 1,000   │
       │                  │          │  Commission: 20  │
       │  [ Submit ]      │          │  Net: 980 ETB    │
       │                  │          │                  │
       │  API: POST       │          │  API: POST       │
       │  /savings/deposit│          │  /savings/withdrw│
       └─────────────────┘          └─────────────────┘
```

### 2.4 Member Slot Management

```
                    ┌─────────────────────────┐
                    │  SLOT SWITCHER (H Scroll) │
                    │                          │
                    │ ┌──────┐ ┌──────┐ ┌────┐ │
                    │ │500   │ │1000  │ │ +  │ │
                    │ │ETB   │ │ETB   │ │Add │ │
                    │ │ R3   │ │ R1   │ │    │ │
                    │ └──────┘ └──────┘ └────┘ │
                    └─────────────────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │  ADD CATEGORY MODAL      │
                    │                          │
                    │  ○ 500 ETB  (10 people)  │
                    │  ○ 1,000 ETB (8 people)  │
                    │  ○ 2,000 ETB (6 people)  │
                    │  ○ 5,000 ETB (4 people)  │
                    │                          │
                    │  API: POST /rounds/{id}  │
                    │  /enroll + POST /slots   │
                    └─────────────────────────┘
```

---

## 3. Admin Process Flow

### 3.1 Admin Login & Access

```
                    ┌─────────────────────────┐
                    │   LANDING PAGE           │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │   LOGIN                  │
                    │   Phone + Password       │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │   API: POST /login       │
                    │   ────────────────────   │
                    │   Response includes      │
                    │   role: "admin"          │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │   AUTH GATE (PIN)        │
                    │   Enter admin PIN        │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │   ADMIN DASHBOARD        │
                    │   ┌───┬───┬───┬───┬──┐  │
                    │   │Ov │Me │Wi │Pa │Ro│  │
                    │   │vrv│mb │nn │ym │un│  │
                    │   │ew │ers│ers│ents│ds│  │
                    │   └───┴───┴───┴───┴──┘  │
                    │   ┌──────────────────┐   │
                    │   │ Promo  │ (tab)   │   │
                    │   └──────────────────┘   │
                    └─────────────────────────┘
```

### 3.2 Admin Overview Page

```
┌─────────────────────────────────────────────────────────┐
│  📊 ADMIN OVERVIEW                                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────┐  │
│  │ 👥 Users   │  │ 📦 Slots  │  │ 👛 Balance │  │ ⬆  │  │
│  │    42      │  │    58     │  │ETB 125,000 │  │Payo│  │
│  └────────────┘  └────────────┘  └────────────┘  └────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  📊 BY CATEGORY                                   │    │
│  │  ● 500 ETB  — 12/12 active · 6,000 ETB           │    │
│  │  ● 1,000 ETB — 8/8 active · 8,000 ETB            │    │
│  │  ● 2,000 ETB — 6/6 active · 12,000 ETB           │    │
│  │  ● 5,000 ETB — 4/4 active · 20,000 ETB           │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  ⚠️ RISK STATUS                                   │    │
│  │  🔴 Liens: 3      🟡 Delinquent: 5               │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  🗄️ Data Source: GET /admin/stats → AdminStats          │
│     (Real DB queries: users, slots, balances, payouts)  │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Admin Members Page

```
┌─────────────────────────────────────────────────────────┐
│  👥 MEMBERS MANAGEMENT                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [🔍 Search by name or phone...]                         │
│                                                          │
│  [All] [500] [1000] [2000] [5000] [Savings]  (category) │
│  [All] [R1] [R2] [R3]                       (rounds)   │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  A Abebe K.  ☎️ 0911111111  · ID: 1               │  │
│  │  ├── 🟢 500 #1 · 500 ETB Active                   │  │
│  │  ├── 🔵 1000 #2 · 2,000 ETB Active                │  │
│  │  └── [Call] [View] [Edit] [🗑️] [📄 PDF]          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  🗄️ Data Source: GET /admin/members → AdminMember[]      │
│     (Real DB: users with their slots)                   │
│                                                          │
│  📄 PDF: Generates binding Equb Agreement with           │
│          collateral clauses and digital signatures       │
└─────────────────────────────────────────────────────────┘
```

### 3.4 Admin Rounds Management

```
┌─────────────────────────────────────────────────────────┐
│  🔄 ROUNDS MANAGEMENT                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [+ CREATE ROUND]                                        │
│                                                          │
│  Active: 3  |  Draft: 1  |  Completed: 5  |  Total: 9  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Morning Circle · 500 ETB     R3    [ACTIVE]      │  │
│  │  🟢 8/10 slots filled                              │  │
│  │  ████████░░ 80%                                    │  │
│  │  Freq: Daily · Ends: Round 12/12                   │  │
│  │  Winners: 2/spin · Last draw: 15/06/2026          │  │
│  │                                                    │  │
│  │  [▶ Spin] [✅ Done] [✏️ Edit] [⛔ Cancel]        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Big Players · 5,000 ETB     R1    [DRAFT]         │  │
│  │  🟡 0/4 slots filled                               │  │
│  │  Freq: Weekly                                       │  │
│  │                                                    │  │
│  │  [▶ Start] [✏️ Edit] [🗑️ Delete]                 │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  🗄️ Data Source: GET /admin/rounds & POST /rounds       │
│     (Real DB: rounds table with status workflow)        │
└─────────────────────────────────────────────────────────┘
```

### 3.5 Round Status Lifecycle

```
                    ┌──────────────┐
                    │   🆕 DRAFT    │
                    │  (Not active) │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   ▶ ACTIVATE │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  🟢 ACTIVE   │◀──────────────────┐
                    │              │                    │
                    │  ┌────────┐  │    Auto-spin at   │
                    │  │ Spin   │──│──▶ scheduled time │
                    │  │ (Draw) │  │                    │
                    │  └───┬────┘  │                    │
                    │      │       │                    │
                    │  ┌───▼────┐  │                    │
                    │  │Winner  │  │    ┌───────────┐  │
                    │  │Paid?   │──│──▶ │ Still has │  │
                    │  │        │  │    │ slots left│  │
                    │  └───┬────┘  │    └─────┬─────┘  │
                    │      │Yes    │          │Yes      │
                    │  ┌───▼────┐  │          │         │
                    │  │ Continue│  │◀─────────┘         │
                    │  │ Spinning│  │                    │
                    │  └─────────┘  │                    │
                    │              │                    │
                    │  No slots left                    │
                    └──────┬───────┘                    │
                           │                            │
                    ┌──────▼───────┐                    │
                    │  ✅ COMPLETED│                    │
                    │  (Done)      │                    │
                    └──────┬───────┘                    │
                           │                            │
                    ┌──────▼───────┐                    │
                    │  ⛔ CANCELLED│─────── (also from   │
                    │             │        DRAFT/ACTIVE) │
                    └─────────────┘                    │
                                                       │
              Alternative Paths:                       │
              🗑️ DELETE — Only allowed on DRAFT       │
              ⛔ CANCEL — Allowed on DRAFT or ACTIVE   │
```

---

## 4. Draw & Winner Process Flow

### 4.1 The Draw Engine (DiceShaker)

```
                    ┌──────────────────────────┐
                    │  DRAWS ARE UNIFIED        │
                    │  SINGLE GLOBAL JAR        │
                    │  (All active pools)       │
                    └────────────┬─────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
          ▼                      ▼                      ▼
  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
  │  PUBLIC PORTAL   │  │  ADMIN PANEL    │  │  AUTO-SPIN      │
  │                  │  │                 │  │                 │
  │  DiceShaker      │  │  "Lucky Spin"   │  │  Cron job at    │
  │  animation       │  │  per category   │  │  scheduled time │
  │  on PortalView   │  │                 │  │                 │
  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
           │                    │                     │
           └────────────────────┼─────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   API: POST /draw     │
                    │   or POST /rounds/spin │
                    │   ─────────────────   │
                    │   1. Find eligible    │
                    │      active slots     │
                    │   2. Random selection │
                    │   3. Create Draw      │
                    │      record           │
                    │   4. Update round     │
                    │      stats            │
                    │   5. Return winners   │
                    └───────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   WINNER TOKENS        │
                    │   (Animated pop-out)   │
                    │                       │
                    │  ┌────┐ ┌────┐ ┌────┐ │
                    │  │500 │ │1000│ │500 │ │
                    │  │#3  │ │#5  │ │#7  │ │
                    │  └────┘ └────┘ └────┘ │
                    └───────────────────────┘
```

### 4.2 Winner Payout Flow

```
                    ┌──────────────────────────┐
                    │  WINNERS TAB (Admin)      │
                    │                           │
                    │  Most Recent Winner:      │
                    │  🏆 Abebe K.              │
                    │  5,000 ETB · Slot #3     │
                    │───────────────────────────│
                    │                           │
                    │  [🏆 Payout]              │
                    └───────────┬──────────────┘
                                │
                    ┌───────────▼──────────────┐
                    │  PAYOUT MODAL             │
                    │                           │
                    │  Step 1: Dialing USSD     │
                    │  *847*123#                │
                    │                           │
                    │  Step 2: Enter PIN        │
                    │  [____]                   │
                    │                           │
                    │  Step 3: Processing...    │
                    │                           │
                    │  Step 4: ✅ Transferred   │
                    │  5,000 ETB                │
                    └───────────────────────────┘
                                │
                    ┌───────────▼──────────────┐
                    │  API: POST /admin/payout │
                    │  ──────────────────────  │
                    │  { draw_id, password }   │
                    │                          │
                    │  On success:             │
                    │  • Draw marked as paid   │
                    │  • Payment log created   │
                    │  • Winner notified       │
                    └──────────────────────────┘

  Alternative Path: Payout Failed ❌
  ┌─────────────────────────────────────────────┐
  │  • Wrong password → Retry prompt            │
  │  • Insufficient balance → "Funds needed"    │
  │  • Network error → "Retry later"            │
  └─────────────────────────────────────────────┘
```

---

## 5. Financial Transaction Flows

### 5.1 Payment Lifecycle

```
                    ┌──────────────────────────┐
                    │  MEMBER INITIATES PAYMENT │
                    │  (Single or Batch)        │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  ROUTING DECISION          │
                    │                            │
                    │  Is server available?      │
                    │     │          │           │
                    │    YES        NO           │
                    │     │          │           │
                    ▼     ▼          ▼           ▼
            ┌────────────┐  ┌────────────┐
            │  API: POST  │  │ Local only │
            │  /payments  │  │ AsyncStorage│
            │  /pay       │  │            │
            └──────┬─────┘  └──────┬─────┘
                   │               │
                   ▼               ▼
            ┌────────────┐  ┌────────────┐
            │  DB Record  │  │ Local cache│
            │  Created    │  │ saved      │
            └────────────┘  └────────────┘
                   │               │
                   └───────┬───────┘
                           ▼
                    ┌────────────┐
                    │ Schedule   │
                    │ Updated    │
                    │ (UI shows  │
                    │ ✅ Paid)   │
                    └────────────┘
                           │
                    ┌───────▼────────┐
                    │ Receipt Modal  │
                    │ + PDF Download │
                    └────────────────┘

  IMPORTANT: The app ALWAYS tries the API first.
  Only falls back to local storage if the server
  is unreachable. This means:
  - Online = Real DB transactions
  - Offline = Local cache, synced when back online
```

### 5.2 Savings Lifecycle

```
                    ┌──────────────────────────┐
                    │  SAVINGS OPERATIONS       │
                    └────────────┬─────────────┘
                                 │
               ┌─────────────────┼─────────────────┐
               │                 │                 │
               ▼                 ▼                 ▼
       ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
       │   DEPOSIT    │  │  WITHDRAW    │  │  STATEMENT   │
       │              │  │              │  │              │
       │ Enter amt    │  │ Max 80% of   │  │ Full tx      │
       │ Min 10 ETB   │  │ balance      │  │ history      │
       │              │  │ 2% comm.     │  │ PDF download │
       │ API: POST    │  │              │  │              │
       │ /savings/    │  │ API: POST    │  │ API: GET     │
       │ deposit      │  │ /savings/    │  │ /savings/    │
       │              │  │ withdraw     │  │ statement/   │
       └──────────────┘  └──────────────┘  └──────────────┘
```

---

## 6. Alternative & Edge Case Flow

### 6.1 All Alternative Paths Summary

| Scenario | Main Path | Alternative Path | User Impact |
|----------|-----------|-----------------|-------------|
| **Payment** | API `POST /payments/pay` | Local storage + `generateSchedule()` | Payment recorded locally, synced later |
| **Savings** | API `POST /savings/deposit` | Local `depositToSavings()` | Balance stored locally |
| **Registration** | API `POST /register` | N/A (API required) | Cannot register offline |
| **Login** | API `POST /login` | Session cached in settings | Offline session restore |
| **Draw** | API `POST /draw/shake` | `demoShake()` generates random winners | Demo animation, no real draw |
| **Payout** | API `POST /admin/payout` | Wrong password → Retry | Payout blocked until correct PIN |
| **Round data** | API `GET /admin/rounds` | Empty state → "No rounds" | Admin sees empty UI |
| **Rounds fallback** | API rounds list | `equbStore` fallback rounds (FALLBACK_ROUNDS) | Static demo data shown |
| **Category edit** | API cascade update | Error toast → "Failed to cascade" | Changes not applied |
| **Slot enroll** | API `/rounds/{id}/enroll` | Local slot created with `roundId: undefined` | Slot created but not enrolled |

### 6.2 Error Handling Flow

```
                    ┌──────────────────────────┐
                    │  ANY API CALL             │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  DOES SERVER RESPOND?     │
                    │                            │
                    │  ┌──────────────────┐     │
                    │  │ YES → Return data │     │
                    │  └──────────────────┘     │
                    │                            │
                    │  ┌──────────────────┐     │
                    │  │ NO → Try fallback│     │
                    │  └──────────────────┘     │
                    └────────────────────────────┘
                                 │
               ┌─────────────────┼─────────────────┐
               │                 │                 │
               ▼                 ▼                 ▼
       ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
       │ Local cache  │  │ Generate     │  │ Show empty   │
       │ (Settings)   │  │ mock data    │  │ state + msg  │
       │              │  │              │  │              │
       │ Auth token,  │  │ Schedules,   │  │ Members,     │
       │ account info │  │ demo draws   │  │ winners, etc │
       └──────────────┘  └──────────────┘  └──────────────┘
```

### 6.3 Concurrency & Edge Cases

```
┌─────────────────────────────────────────────────────────┐
│  EDGE CASE: Member has multiple slots                    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Problem: Different slots may have different      │   │
│  │  registration dates → different payment schedules │   │
│  │                                                   │   │
│  │  Solution: Each slot has its own schedule,        │   │
│  │  generated independently based on registration    │   │
│  │  date and category amount.                        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  EDGE CASE: Round completes but winners not paid         │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Problem: Round is "completed" but payout pending │   │
│  │                                                   │   │
│  │  Solution: Winners tab shows unpaid winners.      │   │
│  │  Admin initiates payout from Winners tab.         │   │
│  │  Draw stays in "unpaid" status until payout.      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  EDGE CASE: 2-month frequency rounds                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Rounds can have '2_month' frequency (every 2    │   │
│  │  months). The schedule generator handles this     │   │
│  │  by spacing payment dates 2 months apart.         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  EDGE CASE: Category cascade update                      │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Admin changes a category (e.g., 500 ETB amount  │   │
│  │  → 600 ETB). This cascades to all rounds and     │   │
│  │  slots in that category via the Brain & Nerve     │   │
│  │  command center (CategoryController::cascade).    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Data Table Map

### 7.1 Admin Pages → Database Tables

| Admin Page | Displayed Data | Database Table(s) | API Endpoint |
|-----------|---------------|-------------------|-------------|
| **Overview** 📊 | Total users, slots, balance, payouts, liens, delinquents | `users`, `slots`, `draws`, `payments` | `GET /admin/stats` |
| **Members** 👥 | Member list with slots, balances, status | `users`, `slots` | `GET /admin/members` |
| **Winners** 🏆 | Draw winners, payout amounts, dates | `draws`, `users` | `GET /admin/winners` |
| **Payments** 💳 | Payment logs with status | `payment_logs`, `payments` | `GET /admin/payments` |
| **Rounds** 🔄 | Round cards, progress, status | `rounds` | `GET /admin/rounds` |
| **Promo** 🎁 | Broker codes, registrations, earnings | `promo_codes` | `GET /admin/promos` |

### 7.2 Member Pages → Database Tables

| Member Page | Displayed Data | Database Table(s) | API Endpoint |
|------------|---------------|-------------------|-------------|
| **Dashboard** 📱 | Payment schedule, stats, savings | `payments`, `savings_transactions` | `GET /payments/{slotId}` |
| **Savings** 💰 | Balances, deposits, withdrawals | `savings_transactions` | `GET /savings/{slotId}` |
| **Slots** 🎯 | Active slots, categories, rounds | `slots`, `rounds` | `GET /slots` |
| **Portal** 🌐 | Active rounds, draw animation | `rounds`, `draws` | `GET /rounds` |

### 7.3 Key Database Tables

```
┌─────────────────────────────────────────────────────────┐
│  KEY TABLES                                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  users ──────< slots ──────< payments                   │
│   │                  │                                   │
│   │                  └──────< savings_transactions       │
│   │                                                      │
│   └──────────< payment_logs                              │
│                                                          │
│  rounds ──────< draws                                    │
│   │                                                      │
│   └──────────< slots (via round_id)                      │
│                                                          │
│  categories ──> rounds (via category code)               │
│                                                          │
│  promo_codes ──> users (via promo_code)                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 8. API Endpoint Reference

### 8.1 Public Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/register` | Create new user + slot |
| POST | `/api/login` | Authenticate and get token |
| POST | `/api/forgot-password` | Request password reset |
| POST | `/api/verify-otp` | Verify OTP code |
| POST | `/api/reset-password` | Set new password |
| GET | `/api/tiers` | Get category tiers |
| GET | `/api/rounds` | List all rounds |
| GET | `/api/rounds/{id}` | Get round details |
| GET | `/api/categories` | List categories |
| POST | `/api/promo/validate` | Validate promo code |

### 8.2 Authenticated (Member) Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/me` | Get current user + slots |
| POST | `/api/logout` | Invalidate token |
| PUT | `/api/profile` | Update profile |
| GET | `/api/slots` | List user's slots |
| POST | `/api/slots` | Create new slot |
| GET | `/api/payments/{slotId}` | Get payment schedule |
| POST | `/api/payments/pay` | Pay single day |
| POST | `/api/payments/pay-multiple` | Pay multiple days |
| GET | `/api/payments/receipt/{id}` | Get payment receipt |
| POST | `/api/rounds/{id}/enroll` | Self-enroll in round |
| GET | `/api/savings/{slotId}` | Get savings info |
| POST | `/api/savings/deposit` | Deposit to savings |
| POST | `/api/savings/withdraw` | Withdraw from savings |
| GET | `/api/savings/statement/{slotId}` | Get savings statement |
| POST | `/api/draw/shake` | Ludo dice shaker draw |

### 8.3 Admin Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/stats` | Dashboard overview stats |
| GET | `/api/admin/members` | List all members |
| GET | `/api/admin/winners` | List draw winners |
| GET | `/api/admin/payments` | List payment logs |
| POST | `/api/admin/draw` | Run manual draw |
| POST | `/api/admin/payout` | Process winner payout |
| POST | `/api/admin/settings` | Update system settings |
| GET/POST/PUT/DELETE | `/api/admin/rounds/*` | Full round CRUD |
| GET/POST/PUT/DELETE | `/api/admin/categories/*` | Full category CRUD |
| GET/POST/PUT/DELETE | `/api/admin/promos/*` | Full promo CRUD |
| POST | `/api/admin/categories/{id}/cascade` | Cascade category update |

---

## 📊 Summary Diagram: Complete Platform Flow

```
                    ┌─────────────────────────────────────┐
                    │         GOJO EQUB PLATFORM           │
                    └─────────────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
         ▼                            ▼                            ▼
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│                    │    │                    │    │                    │
│    👤 VISITOR      │    │    👤 MEMBER       │    │    🛡️ ADMIN       │
│                    │    │                    │    │                    │
│  ┌──────────────┐  │    │  ┌──────────────┐  │    │  ┌──────────────┐  │
│  │ Landing Page │  │    │  │ Dashboard    │  │    │  │ Overview     │  │
│  │ (Portal View)│  │    │  │ • Pay days   │  │    │  │ • Stats      │  │
│  │ • See rounds │  │    │  │ • Savings    │  │    │  │ • Category   │  │
│  │ • Watch draw │──┼──┼─▶│ • Schedule    │  │    │  │ • Risk       │  │
│  │ • Register   │  │    │  │ • Receipts   │  │    │  └──────────────┘  │
│  └──────────────┘  │    │  └──────────────┘  │    │  ┌──────────────┐  │
│                    │    │  ┌──────────────┐  │    │  │ Members      │  │
│  ┌──────────────┐  │    │  │ Portal (Dice │  │    │  │ • Search     │  │
│  │ Live Draw    │──┼──┼──│  │ Shaker/Wheel)│  │    │  │ • Detail     │  │
│  │ Animation    │  │  │  │ • Watch draws │  │    │  │ • PDF Agree  │  │
│  └──────────────┘  │  │  │ • See pools   │  │    │  └──────────────┘  │
│                    │  │  └──────────────┘  │    │  ┌──────────────┐  │
│                    │  │  ┌──────────────┐  │    │  │ Winners      │  │
│                    │  │  │ Add Category │  │    │  │ • Payout     │  │
│                    │  │  │ • New slot   │  │    │  │ • History    │  │
│                    │  │  │ • Enroll     │  │    │  └──────────────┘  │
│                    │  │  └──────────────┘  │    │  ┌──────────────┐  │
│                    │  │                    │    │  │ Rounds       │  │
│                    │  │                    │    │  │ • CRUD       │  │
│                    │  │                    │    │  │ • Spin       │  │
│                    │  │                    │    │  │ • Lifecycle  │  │
│                    │  │                    │    │  └──────────────┘  │
│                    │  │                    │    │  ┌──────────────┐  │
│                    │  │                    │    │  │ Promo/Broker │  │
│                    │  │                    │    │  │ • Generate   │  │
│                    │  │                    │    │  │ • Stats      │  │
│                    │  │                    │    │  └──────────────┘  │
└────────────────────┘  └────────────────────┘  └────────────────────┘
                              │                        │
                              └──────────┬─────────────┘
                                         │
                              ┌──────────▼─────────────┐
                              │   LARAVEL BACKEND       │
                              │   (API + DB)            │
                              │                         │
                              │  ┌─────────────────┐    │
                              │  │ Database Tables  │    │
                              │  │                 │    │
                              │  │ users ═══ slots │    │
                              │  │   ║       ║     │    │
                              │  │   ║  payments    │    │
                              │  │   ║       ║     │    │
                              │  │ rounds ══ draws │    │
                              │  │   ║             │    │
                              │  │ categories ────┘    │
                              │  │ promo_codes          │
                              │  │ savings_transactions │
                              │  └─────────────────┘    │
                              └─────────────────────────┘
```

---

> **Last Updated:** July 16, 2026  
> **Document Version:** 1.0  
> **Author:** Gojo Equb Development Team
