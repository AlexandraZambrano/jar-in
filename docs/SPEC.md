# Jars — Product & Technical Spec (v1)

*Working title: "Jars" (repo: `jar-in`). Rename freely — the spec doesn't depend on the name.*

## 1. Overview

An open-source personal finance app built around a **percentage-based jar system**
(a generalization of the "6 jars" method): the user defines their own buckets and
what percentage of income flows into each one, rather than being forced into an
app's fixed categories. Money is tracked, not moved — jars are budget allocations,
not physical containers.

Distinguishing features vs. existing budgeting apps (YNAB, Goodbudget, etc.):

- Fully user-defined jars and percentages, not preset categories
- Built-in support for people who live together sharing some money and keeping
  the rest private, with per-jar granularity
- AI-assisted onboarding, coaching, and projections, layered on top of real
  computed numbers (never AI-hallucinated math)
- Local-first: works fully offline, data lives on-device first
- Open source and self-hostable

## 2. Target Audience

Students, developers, and general/non-technical users managing personal or
shared household finances. Must be approachable for people with no budgeting
experience (see onboarding agent, §8.1) as well as flexible enough for power
users who want full manual control.

## 3. Core Concept: Wallets, Jars, and Contribution Rules

Two separate entities, deliberately decoupled:

- **Wallet** — a source of funds. Has a currency and an owner (one user, or a
  household). Represents "where money actually sits" (e.g. a personal checking
  account, a shared joint account).
- **Jar** — a budget allocation rule with a percentage. References one or more
  wallets through a **contribution rule**.

Contribution rules define how a jar is funded when it draws from more than one
wallet — e.g. a shared "Household Essentials" jar funded 50/50 by two personal
wallets, or proportional to each partner's income, or a fixed amount each. This
is what makes shared and individual money coexist without forcing couples into
a single joint account.

A **household** is a group of users. It has shared wallets/jars; each member also
keeps personal wallets/jars. A jar's `visibility` is either `personal` or `shared`.

## 4. Jar Types: Flow vs. Accumulation

Every jar is tagged with a type, since "progress" means different things:

- **Flow jars** (e.g. Essentials, Joy-jar) — refill every income cycle, meant to
  be spent down each period. A "target" here is a *spending cap per period*.
  Progress UI: "€180 of €400 spent this month."
- **Accumulation jars** (e.g. Safe fund, Investment) — build up over time toward
  a **target amount** (a real savings goal, e.g. "€10,000 emergency fund").
  Progress UI: running balance vs. target, with a timeline/progression chart.

**Sub-categories:** any jar can optionally have user-defined sub-categories
(e.g. Essentials → rent, energy, water, groceries). Every transaction tags a
jar and, optionally, a sub-category. Analytics and AI narration can report at
either level.

**Withdrawals:** a withdrawal from an accumulation jar is its own event type
(not a normal categorized expense) — carries an optional reason/note, appears
as a labeled marker on the jar's balance-over-time chart, and triggers an
immediate re-projection (rather than waiting for the next scheduled
recalculation). The AI layer specifically narrates withdrawals and their
knock-on effect on the jar's goal date, and over time can flag recurring
withdrawal patterns (e.g. "every December") as forecastable rather than a
surprise.

### Default jar template

Fully user-editable — names, percentages, and sub-category lists can all be
changed or removed.

| Jar | Type | % | Example sub-categories |
|---|---|---|---|
| Essentials | Flow | 50% | rent, energy, water, groceries |
| Investment | Accumulation | 25% | — |
| Safe fund | Accumulation | 15% | — |
| Joy-jar | Flow | 10% | — |

## 5. Household & Sharing Model

- A household is a group of users who share some wallets/jars.
- **Personal jars are fully invisible to other household members by default** —
  not just their transactions, their *existence*. A query for "jars visible to
  member X" only ever selects `visibility = shared` jars; personal jars never
  enter that query, rather than being filtered out after the fact.
- Shared jars are visible to all household members with access, funded via
  each member's contribution rule.
- Household invite/roles (owner vs. member) — permission details to be
  finalized during design, but the visibility rule above is a hard requirement
  from day one.

## 6. Multi-Currency

- Every wallet has its own currency. No forced conversion at the source.
- Ledger entries are stored in their original currency and **never
  destructively converted on write** — only at display time.
- Jars/dashboards roll up into a user's preferred display currency using a
  cached FX rate table, refreshed daily from a free-tier FX API (e.g.
  Frankfurter / exchangerate.host).
- This keeps historical figures accurate even as exchange rates move.

## 7. Income Model

- Income is modeled as its own entity, not a single number: multiple named
  income **sources** per user (salary, freelance, etc.), each with an amount,
  currency, frequency, and destination wallet.
- Every jar's actual funded amount is computed live: sum of active income ×
  that jar's percentage.
- Adding, removing, or changing an income source triggers an **immediate
  re-projection** (same trigger class as a withdrawal, §4) — the AI layer
  explains the consequence in plain language and can suggest a percentage
  rebalance (e.g. "income dropped 15%; at current percentages, Essentials is
  under-funded by €90 — rebalance, or cut into Joy-jar first?"). The user must
  explicitly approve any percentage change — nothing is auto-changed.

## 8. AI Layer (Groq)

Groq is used for narration/reasoning over numbers that are always computed
deterministically in code first — the AI's job is explaining and suggesting,
never doing the arithmetic itself.

### 8.1 Onboarding agent (for finance beginners)

A conversational flow for new users with no budgeting experience: the agent
asks structured questions (rent? utilities? groceries? existing debt? do you
currently save?) and proposes a starting jar set and percentages based on the
answers. This pre-fills the normal, fully-editable jar setup screen — no new
data model, just a guided first run of the same UI.

### 8.2 Narration / coaching

Periodic (e.g. weekly/monthly) plain-language summaries generated from real
computed data: adherence to jar percentages, sub-category breakdowns, notable
withdrawals, income changes.

### 8.3 Projections

- Deterministic math (exponential moving average / simple linear regression)
  on an accumulation jar's growth rate → estimated goal date.
- Recomputed immediately on: withdrawal, income change, percentage change.
- AI layer turns the recomputed numbers into a plain-language explanation of
  what changed and why, plus an optional rebalancing suggestion the user can
  accept or ignore.

## 9. Data Model (core entities)

```
User
 └─ has many → Wallet (personal)
 └─ has many → IncomeSource
 └─ belongs to → Household (optional)

Household
 └─ has many → User (members)
 └─ has many → Wallet (shared)
 └─ has many → Jar (visibility = shared)

Wallet
 - currency
 - owner: User | Household
 └─ funds → Jar (via ContributionRule)

Jar
 - name, percentage, type (flow | accumulation)
 - visibility (personal | shared)
 - target_amount (accumulation only)
 - owner: User | Household
 └─ has many → SubCategory
 └─ has many → Transaction
 └─ has many → WithdrawalEvent (accumulation only)

ContributionRule
 - jar_id, wallet_id
 - mode: fixed_percent | proportional_to_income | fixed_amount
 - value

SubCategory
 - jar_id, name

Transaction
 - jar_id, sub_category_id (nullable)
 - amount, currency, date, note
 - source_type: manual | csv_import | bank_sync (future)
 - external_account_id (nullable — reserved for bank sync)
 - external_transaction_id (nullable, unique — reserved for bank sync,
   prevents double-import)

WithdrawalEvent
 - jar_id, amount, date, reason (optional)
 - triggers immediate re-projection

IncomeSource
 - user_id, name, amount, currency, frequency, destination_wallet_id

FXRate
 - base_currency, quote_currency, rate, fetched_at (refreshed daily)
```

`TransactionSource` is defined as an interface today with two implementations
(`manual`, `csv_import`); a future `bank_sync` implementation (via GoCardless
Bank Account Data, EU-focused open banking, free tier) plugs into the same
interface without a schema migration — this is what "prepared for bank sync
without building it in v1" means concretely.

## 10. Architecture

**Local-first.** Primary data lives in an on-device database
([RxDB](https://rxdb.info)); the app reads/writes there instantly and works
fully offline. The backend (Supabase/Postgres) acts as a passive replication
endpoint — via RxDB's Supabase replication plugin — syncing deltas in the
background rather than being the source of truth for every read.

- **"Login" = unlocking the local database** (PIN/biometric via WebAuthn),
  not a network round-trip on every app open.
- **Household sharing** enforced via Supabase row-level security: each
  household only syncs the shared documents its members are authorized for;
  personal data never leaves the device unless explicitly shared per §5.
- **Conflict resolution:** last-write-wins per field, with a visible change
  history — sufficient for this data shape; full CRDTs are not needed.
- **Platform:** built as an installable **PWA** — one codebase covers mobile
  (installed to home screen on Android/iOS) and desktop (installable in
  Chrome/Edge/Safari). No app store approval or fees required to ship;
  optional native store listings can come later once validated.
  - iOS-specific notes to design around: installed (home-screen) PWAs are
    exempt from Safari's 7-day storage eviction (regular browser tabs are
    not — onboarding should nudge users to actually install, not just
    bookmark); Background Sync API has historically not been supported in
    Safari, so sync should be designed as "on open / on foreground" rather
    than assumed to run silently in the background — verify with a small
    spike before building out the full sync layer.
- **AI calls (Groq):** triggered from the client, calling a small backend
  function (not embedding API keys client-side) that assembles the relevant
  computed numbers into a prompt and returns narration/suggestions.

## 11. Privacy & Security Summary

- Personal jars: existence + contents invisible to other household members
  by default (§5).
- Local-first: sensitive data primarily lives on-device, reducing exposure
  from a centralized breach.
- Local unlock (PIN/biometric) protects data at rest on a lost/unlocked
  device.
- Multi-currency ledger entries never silently overwritten by conversion.
- Bank-sync (future) will need its own token storage / consent flow — the
  `external_account_id` / `external_transaction_id` fields are reserved for
  this now to avoid a painful migration later.

## 12. Tech Stack

- Frontend: React (PWA), TypeScript, installable via web app manifest +
  service worker
- Local database: RxDB (IndexedDB under the hood)
- Backend / sync: Supabase (Postgres, Auth, Row-Level Security, RxDB
  replication plugin)
- AI: Groq (narration, coaching, onboarding agent, rebalance suggestions)
- FX rates: Frankfurter or exchangerate.host (free tier), refreshed daily
- Future bank sync: GoCardless Bank Account Data (EU open banking)
- Hosting: self-hosted, consistent with existing Hetzner + Coolify setup
- Distribution: web (installable PWA) first; optional F-Droid / GitHub
  releases packaging later if a native Android wrapper is ever wanted

## 13. MVP Scope (v1)

**In scope:**

- Jar setup (default template + full editing: name, %, sub-categories, type)
- Onboarding AI agent for beginners
- Wallets (personal + shared), contribution rules
- Household creation/invite, personal-jar privacy enforcement
- Multi-currency wallets + display-currency rollup
- Income sources (multiple, editable) driving jar funding
- Manual transaction entry + CSV import, tagged to jar/sub-category
- Accumulation jar targets, progress tracking, withdrawal events
- Projections (deterministic) + AI narration/coaching
- Local-first storage, install-to-home-screen PWA, local PIN/biometric unlock
- Background sync to Supabase for multi-device/household sync

**Explicitly deferred (but architecturally prepared for):**

- Real bank account sync (GoCardless integration)
- Native app store packaging (if ever — PWA is the default distribution)

## 14. Suggested Phased Roadmap

1. **Core ledger, single user:** wallets, jars (flow/accumulation), income
   sources, manual transactions, local-first storage — no sharing, no AI yet.
2. **Multi-currency + sub-categories + withdrawal events + target/progress UI.**
3. **AI layer:** onboarding agent, narration, projections (Groq).
4. **Household sharing:** multi-user sync, contribution rules, personal-jar
   privacy enforcement, Supabase RLS.
5. **Polish + PWA installability:** manifest, service worker, offline UX,
   iOS-specific sync behavior, CSV import.
6. **v2+:** bank sync (GoCardless), richer AI rebalancing, shared household
   analytics, native store packaging if warranted.
