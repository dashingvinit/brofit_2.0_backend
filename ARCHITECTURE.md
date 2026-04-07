# Brofit 2.0 Backend — Architecture Reference

> Last updated: 2026-04-08

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Directory Structure](#2-directory-structure)
3. [Database Schema](#3-database-schema)
4. [API Endpoints](#4-api-endpoints)
5. [Layer Responsibilities](#5-layer-responsibilities)
6. [Shared Utilities](#6-shared-utilities)
7. [Scheduler / Cron Jobs](#7-scheduler--cron-jobs)
8. [WhatsApp Integration](#8-whatsapp-integration)
9. [Authentication & Multi-Tenancy](#9-authentication--multi-tenancy)
10. [Known Issues & Optimization Targets](#10-known-issues--optimization-targets)

---

## 1. Tech Stack

| Concern | Library |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL (Neon serverless) |
| Auth | Clerk (`@clerk/express`) |
| Scheduling | `node-cron` |
| Notifications | Twilio (WhatsApp) |
| Environment | `dotenv` + custom `env.config.js` |

---

## 2. Directory Structure

```
brofit_2.0_backend/
├── server.js                              # Entry point — CORS, middleware, graceful shutdown
├── prisma/
│   └── schema.prisma                      # Single source of truth for DB schema
├── scripts/
│   ├── fix-indexes.js                     # One-off: repair DB indexes
│   └── fix-user-indexes.js                # One-off: repair Clerk user indexes
└── src/
    ├── api/
    │   ├── index.js                       # Mounts /api/v1
    │   └── v1/
    │       ├── index.js                   # Aggregates all feature routers
    │       └── features/
    │           ├── member/
    │           ├── membership/
    │           ├── training/
    │           ├── trainer/
    │           ├── plan/
    │           ├── attendance/
    │           ├── financials/
    │           ├── analytics/
    │           ├── reports/
    │           ├── notifications/
    │           ├── offer/
    │           ├── staff-permissions/
    │           ├── platform/              # Super-admin only
    │           └── whatsapp-webhook/      # Twilio webhook (no auth)
    ├── config/
    │   ├── env.config.js                  # Validates & exports env vars
    │   └── prisma.config.js               # Prisma client singleton
    ├── scheduler/
    │   ├── index.js                       # Registers cron jobs
    │   └── jobs/
    │       ├── expire-and-snapshot.job.js # Daily: expire subs + snapshot
    │       └── whatsapp-digest.job.js     # Daily: owner WhatsApp digest
    └── shared/
        ├── helpers/
        │   ├── auth.helper.js             # Clerk auth extraction + role checks
        │   └── subscription.helper.js     # Pricing, date, transition helpers
        ├── middlewares/
        │   ├── errorHandler.js            # Global error → standard response
        │   ├── requireInternalSecret.js   # Protects cron-trigger routes
        │   └── index.js
        ├── repositories/
        │   ├── crud.repository.js         # Base CRUD class (all repos extend this)
        │   └── payment.repository.js      # Cross-feature payment aggregations
        └── services/
            ├── payment.service.js         # Payment recording + validation
            └── whatsapp.service.js        # Twilio send helpers
```

Each feature folder has this internal structure:

```
features/<feature>/
├── <feature>.routes.js          # Express router
├── controllers/
│   └── <feature>.controller.js  # Parses request → calls service → sends response
├── services/
│   └── <feature>.service.js     # Business logic
└── repositories/
    └── <feature>.repository.js  # Prisma queries (extends CrudRepository)
```

---

## 3. Database Schema

### Entity Map

| Model | Table | Purpose |
|---|---|---|
| `Organization` | `organizations` | Gym/business tenant |
| `Member` | `members` | Gym members |
| `PlanType` | `plan_types` | Plan template (membership or training) |
| `PlanVariant` | `plan_variants` | Specific duration + price tier |
| `Membership` | `memberships` | A member's active/past membership |
| `Training` | `trainings` | A member's personal training package |
| `Trainer` | `trainers` | Staff trainers |
| `TrainerPayout` | `trainer_payouts` | Monthly commission ledger per training |
| `Payment` | `payments` | Revenue transaction (linked to membership or training) |
| `Expense` | `expenses` | Operating costs |
| `Investment` | `investments` | Capital investments (for ROI) |
| `Offer` | `offers` | Discounts / promos / referral rewards |
| `Attendance` | `attendances` | Daily check-in / check-out records |
| `AttendanceHourlySnapshot` | `attendance_hourly_snapshots` | Pre-computed hourly check-in counts |
| `DailyActivitySnapshot` | `daily_activity_snapshots` | Pre-computed daily member counts (cron) |
| `OrgStaffPermissions` | `org_staff_permissions` | Per-org role-based permission defaults |
| `OrgNotificationSettings` | `org_notification_settings` | Per-org WhatsApp config |

### Key Relationships

```
Organization
  ├── Members (1:N)
  │     ├── Memberships (1:N) ──► PlanVariant ──► PlanType
  │     ├── Trainings   (1:N) ──► PlanVariant, Trainer
  │     ├── Payments    (1:N)
  │     ├── Attendances (1:N)
  │     └── referredBy  (self-join: Member → Member)
  ├── PlanTypes ──► PlanVariants
  ├── Trainers ──► TrainerPayouts
  ├── Expenses / Investments
  ├── Offers ──► Memberships / Trainings
  ├── AttendanceHourlySnapshots
  ├── DailyActivitySnapshots
  ├── OrgStaffPermissions   (1:1)
  └── OrgNotificationSettings (1:1)
```

### Enums

| Enum | Values |
|---|---|
| `PlanCategory` | `membership`, `training` |
| `MembershipStatus` | `active`, `expired`, `cancelled`, `frozen` |
| `TrainingStatus` | `active`, `expired`, `cancelled`, `frozen` |
| `PaymentMethod` | `cash`, `card`, `upi`, `bank_transfer`, `other` |
| `PaymentStatus` | `paid`, `pending`, `failed`, `refunded` |
| `ExpenseCategory` | `rent`, `utilities`, `staff`, `equipment`, `marketing`, `maintenance`, `other` |
| `OfferType` | `event`, `referral`, `discount`, `promo` |
| `DiscountType` | `flat`, `percentage` |

### Indexes

Critical indexes already in schema:

```
members:                    orgId, phone, clerkUserId
memberships:                memberId, status, endDate
trainings:                  memberId, status, endDate, trainerId
attendances:                orgId, date, orgId+date, orgId+exitTime, orgId+memberId+exitTime
plan_types:                 orgId, isActive, category
plan_variants:              planTypeId, isActive
payments:                   memberId, membershipId, trainingId
trainer_payouts:            trainerId, orgId — unique(trainingId, month, year)
daily_activity_snapshots:   orgId — unique(orgId, snapshotDate)
attendance_hourly_snapshots: orgId — unique(orgId, date, hour)
offers:                     orgId, type, isActive
```

**Missing indexes to add:**
- `payments(orgId, paidAt)` — needed for revenue queries scoped by org + date range
- `expenses(orgId, date)` — needed for P&L monthly grouping
- `memberships(orgId, status)` — needed for bulk expiry + active count queries

---

## 4. API Endpoints

All routes are under `/api/v1/`. All require Clerk authentication except `/api/v1/webhooks/whatsapp`.

Standard response shapes:
```js
// List
{ success: true, data: [...], meta: { page, limit, total, pages, hasNext, hasPrev } }

// Single
{ success: true, data: { ... } }

// Error
{ success: false, message: "..." }
```

---

### Members — `/api/v1/members`

| Method | Path | Description |
|---|---|---|
| GET | `/` | List members (paginated). Filters: `isActive`, `joinedFrom`, `joinedTo`, `page`, `limit` |
| POST | `/` | Create a new member |
| GET | `/search` | Search by name / phone / email / plan name |
| GET | `/stats` | Monthly cohort stats (new, active, inactive counts) |
| GET | `/:id` | Get member by ID (includes referral info) |
| PATCH | `/:id` | Update member fields |
| DELETE | `/:id` | Soft delete member (`isActive = false`) |
| POST | `/import` | Bulk import from CSV |
| PATCH | `/batch` | Batch update members |
| DELETE | `/batch` | Batch delete members |

---

### Memberships — `/api/v1/memberships`

| Method | Path | Description |
|---|---|---|
| GET | `/` | List all memberships. Filters: `status`, `memberId`, `startFrom`, `endBefore` |
| POST | `/` | Create membership (atomically creates payment record) |
| GET | `/expiring` | Memberships expiring soon |
| GET | `/stats` | Aggregate counts by status |
| GET | `/:id` | Get single membership (with member + plan + payments) |
| PATCH | `/:id` | Update membership |
| DELETE | `/:id` | Hard delete membership |
| POST | `/:id/cancel` | Cancel membership (validates transition) |
| POST | `/:id/freeze` | Freeze membership |
| POST | `/:id/unfreeze` | Unfreeze membership |
| GET | `/member/:memberId` | All memberships for a member |
| GET | `/member/:memberId/active` | Active membership for a member |
| GET | `/member/:memberId/dues` | Outstanding dues for a member |
| POST | `/payments` | Record payment against membership |
| PATCH | `/payments/:paymentId` | Update payment status |
| DELETE | `/payments/:paymentId` | Delete payment |
| POST | `/batch/cancel` | Batch cancel memberships |
| POST | `/batch/freeze` | Batch freeze memberships |
| POST | `/batch/unfreeze` | Batch unfreeze memberships |

---

### Trainings — `/api/v1/trainings`

Mirrors the Memberships structure exactly, with the addition of:

| Method | Path | Description |
|---|---|---|
| GET | `/` | Filters include `trainerId` additionally |
| POST | `/` | Requires `trainerId`; also creates trainer payout slots |

---

### Trainers — `/api/v1/trainers`

| Method | Path | Description |
|---|---|---|
| GET | `/` | List all trainers |
| POST | `/` | Create trainer |
| GET | `/payout-summary` | Outstanding payout summary across all trainers |
| GET | `/:id` | Get trainer |
| PATCH | `/:id` | Update trainer (name, splitPercent) |
| PATCH | `/:id/deactivate` | Deactivate trainer |
| GET | `/:id/clients` | Active clients for trainer |
| GET | `/:id/history` | Assignment history |
| GET | `/:id/payout-schedule` | Monthly payout schedule for a trainer |
| GET | `/:id/payout-history` | Recorded payouts |
| POST | `/:id/payouts` | Record a payout for a month/training |

---

### Plans — `/api/v1/plans`

| Method | Path | Description |
|---|---|---|
| GET | `/types` | All active plan types. Filter: `category` |
| GET | `/types/all` | All plan types including inactive |
| POST | `/types` | Create plan type |
| GET | `/types/:id` | Get plan type |
| PATCH | `/types/:id` | Update plan type |
| DELETE | `/types/:id` | Delete plan type |
| PATCH | `/types/:id/deactivate` | Soft deactivate |
| GET | `/types/:planTypeId/variants` | Variants for a plan type |
| POST | `/types/:planTypeId/variants` | Create variant |
| GET | `/variants/:id` | Get variant |
| PATCH | `/variants/:id` | Update variant |
| DELETE | `/variants/:id` | Delete variant |
| PATCH | `/variants/:id/deactivate` | Soft deactivate |
| POST | `/import` | Bulk import plan types + variants from CSV |

---

### Attendance — `/api/v1/attendance`

| Method | Path | Description |
|---|---|---|
| GET | `/` | Attendance records for a date. Query: `date` (YYYY-MM-DD) |
| POST | `/check-in` | Check in a member (prevents double check-in) |
| PATCH | `/:id/check-out` | Check out a member |
| GET | `/inside` | Members currently inside (no exit time) |
| GET | `/stats` | Today's stats: total, inside, average |
| GET | `/peak-hours` | Hourly distribution (today + historical avg) |
| GET | `/member/:memberId` | Attendance history for a member |

---

### Financials — `/api/v1/financials`

| Method | Path | Description |
|---|---|---|
| GET | `/expenses` | List expenses. Filters: `month` (YYYY-MM), `category` |
| POST | `/expenses` | Create expense |
| PATCH | `/expenses/:id` | Update expense |
| DELETE | `/expenses/:id` | Delete expense |
| GET | `/investments` | List investments |
| POST | `/investments` | Create investment |
| PATCH | `/investments/:id` | Update investment |
| DELETE | `/investments/:id` | Delete investment |
| GET | `/summary` | P&L summary for a month: revenue − expenses |
| GET | `/roi` | Total invested vs total net profit, payback months |
| GET | `/trends` | Month-by-month revenue + expense trends |

---

### Analytics — `/api/v1/analytics`

| Method | Path | Description |
|---|---|---|
| GET | `/top-plans` | Plans ranked by count + revenue |
| GET | `/retention` | Repeat vs one-time vs churned member rates |
| GET | `/revenue-breakdown` | Revenue split by membership vs training, by month |
| GET | `/payment-methods` | Distribution of payment methods |
| GET | `/trainer-performance` | Per-trainer: active clients, revenue, avg price |
| GET | `/member-growth` | New member cohorts by month |
| GET | `/demographics` | Age buckets + gender split |

---

### Reports — `/api/v1/reports`

| Method | Path | Description |
|---|---|---|
| POST | `/expire-subscriptions` | **Cron-protected** (`x-cron-secret`). Expire stale subs + auto-renew |
| POST | `/sync-expirations` | Manual trigger for expiry sync |
| GET | `/inactive-candidates` | Members who could be deactivated (no active sub) |
| GET | `/dues` | Members with outstanding dues |
| GET | `/activity-trend` | Daily snapshot trend (last 30 days) |

---

### Notifications — `/api/v1/notifications`

| Method | Path | Description |
|---|---|---|
| GET | `/inbox` | Recent notification log |
| GET | `/settings` | Get org's WhatsApp settings |
| PATCH | `/settings` | Update WhatsApp settings |
| POST | `/test` | Send test WhatsApp to owner |
| POST | `/broadcast` | Broadcast message to filtered members |
| POST | `/run-digest` | Manually trigger digest |
| POST | `/send-welcome-all` | Send welcome to all opted-in members |
| GET | `/welcome-status` | Count: sent vs pending welcome messages |
| POST | `/send-welcome-test` | Test welcome message |
| GET | `/default-welcome` | Get default welcome template text |

---

### Offers — `/api/v1/offers`

| Method | Path | Description |
|---|---|---|
| GET | `/` | List offers. Filters: `type`, `isActive` |
| POST | `/` | Create offer |
| GET | `/:id` | Get offer |
| PATCH | `/:id` | Update offer |
| DELETE | `/:id` | Delete offer |

---

### Staff Permissions — `/api/v1/staff-permissions`

| Method | Path | Description |
|---|---|---|
| GET | `/` | Get org's default staff permission flags |
| PATCH | `/` | Update default flags (org admin only) |
| GET | `/members` | List staff members with their Clerk roles |
| PATCH | `/:clerkUserId` | Update individual staff member permissions |

---

### Platform (super-admin) — `/api/v1/platform`

All routes require `requireSuperAdmin` middleware.

| Method | Path | Description |
|---|---|---|
| GET | `/orgs` | List all organizations |
| POST | `/orgs` | Create organization |
| GET | `/orgs/:id` | Get organization details |
| PATCH | `/orgs/:id` | Update organization |
| DELETE | `/orgs/:id` | Delete organization |
| PATCH | `/orgs/:id/status` | Set org active/inactive |
| GET | `/orgs/:id/members` | List members in org |
| POST | `/orgs/:id/invite` | Invite user to org via Clerk |
| GET | `/orgs/:id/invitations` | List pending invitations |

---

### WhatsApp Webhook — `/api/v1/webhooks/whatsapp`

| Method | Path | Description |
|---|---|---|
| POST | `/` | Twilio delivery status webhook (no auth) |

---

## 5. Layer Responsibilities

### Controller
- Parse `req.params`, `req.query`, `req.body`
- Extract `orgId` via `auth.helper`
- Call service method
- Return standardized response
- **No business logic**

### Service
- Validate inputs (existence checks, status transitions, pricing)
- Orchestrate calls to one or more repositories
- Use `subscription.helper` for shared business rules
- Use Prisma transactions for atomic operations
- Fire-and-forget side effects (WhatsApp) via `.catch(() => {})`

### Repository
- Prisma queries only
- Extends `CrudRepository` for standard CRUD
- Uses `prisma.$queryRaw` only for complex aggregations that cannot be expressed in Prisma query builder

### CrudRepository (base class)

```js
create(data)
get(id)
getAll(options)                    // include, orderBy, where
update(id, data)
destroy(id)                        // soft delete: isActive = false
hardDelete(id)
find(where, options)
findOne(where, options)
findWithPagination(where, options) // returns { data, meta: { page, limit, total, ... } }
count(where)
exists(where)
updateMany(where, data)
deleteMany(where)
insertMany(dataArray)
```

---

## 6. Shared Utilities

### `auth.helper.js`

```js
getOrgId(req)                      // Returns orgId from Clerk session
requireOrgId(req, res)             // Throws 400 if orgId missing
getOrgRole(req)                    // Returns 'org:admin' | 'org:staff' | 'org:member'
requireSuperAdmin(req, res, next)  // Middleware: validates super-admin claim via Clerk API
requireOrgAdmin(req, res, next)    // Middleware: validates org:admin role
requireActiveOrg(req, res, next)   // Middleware: validates org.isActive = true
```

### `subscription.helper.js`

```js
createError(message, status)                        // Creates Error with .statusCode
validateMemberExists(memberId)                      // Fetch member or throw 404
validatePlanVariant(id, category)                   // Fetch variant, check isActive + category
calculateDates(startDate, durationDays)             // Returns { startDate, endDate }
calculatePricing(price, discountAmount)             // Returns { priceAtPurchase, discountAmount, finalPrice }
validateStatusTransition(currentStatus, action, name) // Throws if transition is invalid
calculateDues(entity, paidAmount, idField)          // Returns { dueAmount, isFullyPaid }
validatePaymentAmount(amount, finalPrice, paid, name) // Prevents overpayment
getStartOfCurrentMonth()                            // UTC month boundary DateTime
countActiveMembers(orgId)                           // Count members with isActive + active sub
```

### `payment.service.js`

```js
recordPayment(orgId, memberId, subscriptionId, type, paymentData)
updatePaymentStatus(paymentId, orgId, status)
validatePaymentAmount(amount, subscription)
```

### `whatsapp.service.js`

```js
formatPhone(phone)                          // Normalizes to +91XXXXXXXXXX
sendWelcomeTemplate(phone, { name, ... })   // Sends approved WhatsApp template
sendWhatsApp(phone, body)                   // Free-form message
sendWhatsAppBulk(phones, body)              // Batch, fire-and-forget
```

Never throws — always logs errors and returns a boolean.

### Error Middleware (`errorHandler.js`)

- Catches all errors passed via `next(error)`
- Maps Postgres error codes: `23505` → 409 Conflict, `23503` → 400 Bad Request
- Strips stack trace in production
- Always returns `{ success: false, message: "..." }`

---

## 7. Scheduler / Cron Jobs

Registered in `src/scheduler/index.js` using `node-cron`.

| Schedule | Job | What it does |
|---|---|---|
| Daily 1:00 AM UTC | `expire-and-snapshot.job` | Loops all orgs: expire stale memberships/trainings, auto-renew flagged ones, deactivate members with no active sub, write `DailyActivitySnapshot` row |
| Daily 1:30 AM UTC (7:00 AM IST) | `whatsapp-digest.job` | Sends owner digest via WhatsApp (expiries, new members, dues, attendance summary) |

Per-org errors are caught individually — one failing org does not block others.

Cron routes (e.g., `POST /reports/expire-subscriptions`) are protected by `requireInternalSecret` middleware which checks the `x-cron-secret` header.

---

## 8. WhatsApp Integration

- Provider: **Twilio**
- Credentials: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
- Messages are sent only to members with `whatsappOptedIn = true`
- Templates are used for the 24-hour messaging window restriction
- All sends are fire-and-forget; failures are logged but never surface as API errors

---

## 9. Authentication & Multi-Tenancy

- **Clerk** handles user identity and organization management
- Every request carries a Clerk session with `userId` and `orgId`
- `orgId` is extracted in `auth.helper.getOrgId()` and passed to every service/repository call
- **All Prisma queries are scoped to `orgId`** — there is no cross-org data leak possible at the query level
- Role hierarchy: `super-admin` (platform) > `org:admin` > `org:staff` > `org:member`
- Staff permissions are stored per-org in `OrgStaffPermissions` and can be overridden per-user by an admin

---

## 10. Known Issues & Optimization Targets

### Code Duplication

| Issue | Affected Files | Fix |
|---|---|---|
| Repeated Prisma `include` patterns (planVariant → planType) | `membership.repository`, `training.repository` | Extract to a named constant |
| `resolveOfferDiscount` logic duplicated in membership + training services | Both service files | Move to `subscription.helper` |
| `Promise.allSettled` batch pattern repeated | `member.service`, `notifications.service` | Extract to `shared/helpers/batch.helper.js` |
| Date boundary `.setHours(0,0,0,0)` scattered everywhere | Multiple files | Add `startOfDay(date)` to `subscription.helper` |
| Status transition validation duplicated across membership + training controllers | Both controllers | Already in helper — remove controller copies |

### Missing Indexes

```sql
-- Add these to schema.prisma
@@index([orgId, paidAt])     -- on payments (revenue queries)
@@index([orgId, date])       -- on expenses (P&L grouping)
@@index([orgId, status])     -- on memberships (bulk expiry + active count)
```

### Architecture Improvements

| Priority | Issue | Recommendation |
|---|---|---|
| High | No input validation at route entry | Add Zod schemas per route; validate before controller |
| High | No caching on read-heavy endpoints | Redis or in-memory TTL cache for analytics + stats (5–15 min) |
| Medium | Raw SQL mixed with Prisma in `payment.repository` | Document the decision; isolate raw SQL into named query functions |
| Medium | No rate limiting | Add `express-rate-limit` on bulk import + broadcast endpoints |
| Medium | No structured logging | Replace `console.log` with Pino or Winston |
| Low | Payment double-submit risk | Add `idempotencyKey` field to `Payment` model |
| Low | No OpenAPI docs | Add Swagger via `swagger-jsdoc` |
| Low | Backend is plain JavaScript | Migrate to TypeScript to leverage Prisma-generated types |

### Two Analytics Modules (Confusing Naming)

- `/api/v1/financials` — P&L, ROI, expense trends (`financials/analytics.controller.js`)
- `/api/v1/analytics` — Business intelligence (top plans, retention, demographics)

These are logically separate but the naming is inconsistent. The financials analytics controller is inside the `financials` feature folder. Consider renaming to make the distinction clear in code.
