# QueueLess — Phased Production Roadmap & Status Tracking

This document is the authoritative tracking artifact for QueueLess production hardening and feature rollout across the stack (`backend/`, `frontend/`, `mobile/`).

---

## 🚦 Status Legend
- ⚪ **Not Started**: Scoped and documented; awaiting previous phase completion.
- 🟡 **In Progress**: Active development or testing underway.
- 🔴 **Blocked**: Dependent on an unresolved issue or external dependency.
- 🟢 **Implemented**: Code and automated tests written.
- 🔵 **Verified**: Cross-platform verification, lint, build, and regression tests passed.

---

## 📅 Roadmap Overview & Execution Matrix

| Phase | Description | Backend | Web Frontend | Mobile App | Verification | Overall Status |
|---|---|---|---|---|---|---|
| **Phase 0** | **Baseline & Production Safety**<br>Audits, test harness, CI readiness, baseline documentation | 🔵 Verified | 🔵 Verified | 🔵 Verified | 🔵 Verified | 🔵 **Verified** |
| **Phase 1** | **Backend Security & Production Hardening**<br>Auth fail-closed, ticket authorization, request validation, state machine, indexes, error handling | 🔵 Verified | 🔵 Verified | 🔵 Verified | 🔵 Verified | 🔵 **Verified** |
| **Phase 2** | **Reliable Queue Engine**<br>Centralized queue service, unified wait estimator, atomic state transitions, real-time sync | 🔵 Verified | 🔵 Verified | 🔵 Verified | 🔵 Verified | 🔵 **Verified** |
| **Phase 3** | **Smart Wait Predictions**<br>Dynamic prediction model, actual timestamp tracking (`serviceStartedAt`), confidence metadata | 🔵 Verified | 🔵 Verified | 🔵 Verified | 🔵 Verified | 🔵 **Verified** |
| **Phase 4** | **Turn-Approaching Notifications**<br>Configurable threshold triggers (e.g. 2-3 ahead), deduplication, browser web alerts & mobile push | 🔵 Verified | 🔵 Verified | 🔵 Verified | 🔵 Verified | 🔵 **Verified** |
| **Phase 5** | **Favourites & Quick Rebooking**<br>Customer saved stores, availability verification, rapid 1-click rebooking flow | 🔵 Verified | 🔵 Verified | 🔵 Verified | 🔵 Verified | 🔵 **Verified** |
| **Phase 6** | **Merchant Analytics**<br>Aggregated throughput, wait/service duration analytics, peak hours, date-range filtering | 🔵 Verified | 🔵 Verified | 🔵 Verified | 🔵 Verified | 🔵 **Verified** |
| **Phase 7** | **Secure Shareable Queue Tickets**<br>Unguessable scoped share tokens, rate limiting, revocable public viewer page | 🔵 Verified | 🔵 Verified | 🔵 Verified | 🔵 Verified | 🔵 **Verified** |
| **Phase 8** | **Production Scalability & Operational Maturity**<br>Structured logging, health/readiness endpoints, rate limiting, graceful shutdown, backup/restore runbooks | 🔵 Verified | 🔵 Verified | 🔵 Verified | 🔵 Verified | 🔵 **Verified** |

---

## Detailed Phase Breakdown

### Phase 0 — Baseline & Production Safety
- **Goal:** Establish a solid testing harness, verify build health across all three apps, and document architecture/contracts.
- **Backend:**
  - Setup Jest/ts-jest + Supertest + in-memory test database for automated API testing.
  - Replace placeholder `"echo \"Error: no test specified\" && exit 1"` test script.
- **Web Frontend:**
  - Verify Next.js 16 build and linting.
- **Mobile App:**
  - Verify Expo/TypeScript compilation and linting.
- **Artifacts:**
  - `docs/ROADMAP.md`
  - `docs/ARCHITECTURE.md`
  - `docs/API_CONTRACT.md`
- **Verification Status: 🔵 VERIFIED**
  - Backend Jest test suite installed and operational (`npm test` executes cleanly).
  - Web Next.js 16 build succeeds (`npm run build` generates all static and dynamic pages with 0 errors).
  - Mobile TypeScript checks pass (`npx tsc --noEmit` exits with code 0).
  - Initial test coverage for `/` and `/health` passing.

---

### Phase 1 — Backend Security & Production Hardening
- **Goal:** Close all P0 security vulnerabilities, enforce role-based access, and prevent state corruption.
- **Backend:**
  - `authMiddleware`: Fail closed on all error paths (explicit `return` on 401). Enforced fail-fast check in production if `JWT_SECRET` is unset.
  - Role-based authorization: Added `requireRole("business")` and `requireRole("customer")` guards to routes.
  - Ticket authorization: Enforced authentication on `GET /api/queue/status/:id` and verified requester ownership (`customerId === req.user.id || businessId === req.user.id`).
  - Customer cancellation: Implemented and secured `POST /api/queue/cancel`.
  - Socket.IO security: Authenticate socket connections with JWT; verify business and ticket ownership before allowing room joins.
  - Input Validation: Strict validation for registration, login, service catalog updates, and settings.
  - Queue State Machine: Enforced valid status transitions (`waiting` -> `in_progress` -> `completed` or `cancelled`). Disallowed arbitrary jumps.
  - Duplicate Prevention: Prevent duplicate active bookings for the same customer at the same store on the same day.
  - Operating Hours & Timezone: Added IANA `timezone` to `IBusinessProfile` and implemented `isStoreOpenNow` helper using `Intl.DateTimeFormat`.
  - Database Performance: Added compound indexes to `QueueEntry` and lifecycle timestamps (`serviceStartedAt`, `completedAt`, `cancelledAt`, `actualServiceDurationMin`).
- **Web & Mobile Integration:**
  - Web: Attached auth tokens to Socket.IO connections in `dashboard` and `status` pages.
  - Mobile: Added cancellation ("Leave Queue") flow to `QueueStatusScreen.tsx` with confirmation modal and error handling.
- **Verification Status: 🔵 VERIFIED**
  - All 18 automated backend unit & integration tests pass across 3 test suites (`src/__tests__/health.test.ts`, `src/__tests__/authMiddleware.test.ts`, `src/__tests__/security.test.ts`).
  - Backend TypeScript build (`npm run build`) compiles cleanly with 0 errors.
  - Web Next.js production build (`npm run build`) compiles cleanly with 0 errors.
  - Mobile Expo TypeScript check (`npx tsc --noEmit`) passes with 0 errors.

---

### Phase 2 — Reliable Queue Engine
- **Implementation Details:**
  - Created [`backend/src/services/queueService.ts`](file:///d:/Projects/Projects/QueueLess/backend/src/services/queueService.ts):
    - Authoritative wait estimator (`calculateTicketWaitEstimate`): Remaining time of currently active `in_progress` ticket + total duration of `waiting` customers ahead.
    - Zeroed wait time for completed, cancelled, or currently-served tickets.
    - Eliminated all hardcoded 10-minute fallbacks across all handlers.
    - Enforced atomic state transitions (`transitionTicketStatusService`) emitting typed real-time Socket.IO events (`queue_updated`, `status_updated`).
    - Added cursor-based pagination helper (`getCustomerHistoryService`) supporting both array and paginated format responses.
  - Refactored [`backend/src/controllers/queueController.ts`](file:///d:/Projects/Projects/QueueLess/backend/src/controllers/queueController.ts) and [`backend/src/controllers/businessController.ts`](file:///d:/Projects/Projects/QueueLess/backend/src/controllers/businessController.ts) to delegate directly to `queueService`.
  - Web & Mobile synchronization: Unified data contract verified across `StatusPage`, `DashboardPage`, and mobile `QueueStatusScreen`.
- **Verification Status: 🔵 VERIFIED**
  - Added unit test suite [`src/__tests__/queueService.test.ts`](file:///d:/Projects/Projects/QueueLess/backend/src/__tests__/queueService.test.ts) covering state machine rules and exact wait estimation formulas (7/7 tests passed).
  - All 25 automated backend tests across 4 suites pass cleanly (`npm test`).
  - Backend compiles with 0 errors (`npm run build`).
  - Web Next.js compiles with 0 errors (`npm run build`).
  - Mobile Expo TypeScript check passes with 0 errors (`npx tsc --noEmit`).

---

### Phase 3 — Smart Wait Predictions
- **Goal:** Adaptive queue predictions based on actual service times and historical data.
- **Backend:**
  - Track lifecycle timestamps: `joinedAt`, `serviceStartedAt`, `completedAt`, `cancelledAt`.
  - Record actual service duration (`actualServiceDurationMin`) vs estimated duration on completion.
  - Dynamic prediction algorithm accounting for merchant historical speed ratio (`[0.65, 1.45]` clamp) and generating confidence metadata (`confidenceLabel`, `minWaitMin`, `maxWaitMin`, `rangeDisplay`).
  - Unit tests added to `queueService.test.ts` covering speed ratio calculations, confidence scoring, and range formatting.
- **Web & Mobile Integration:**
  - Web: Updated `/status/[id]` and home page active tickets to display smart prediction ranges, confidence pills, and dynamic start times.
  - Mobile: Updated `mobile/src/types.ts`, `QueueStatusScreen.tsx`, and `CustomerHomeScreen.tsx` to render telemetry pills, confidence badges, and dynamic wait ranges.
- **Verification Status: 🔵 VERIFIED**
  - All 27 automated tests pass across 4 suites in `backend` (`npm test`).
  - Backend compiles with 0 errors (`npm run build`).
  - Web Next.js 16 build compiles with 0 errors (`npm run build`).
  - Mobile TypeScript check compiles with 0 errors (`npx tsc --noEmit`).

---

### Phase 4 — Turn-Approaching Notifications
- **Goal:** Notify customers before their turn arrives to minimize counter delays.
- **Backend:**
  - Added `notificationLedger: { turnApproachingSentAt, yourTurnSentAt }` to `QueueEntry` model and schema to enforce persistent deduplication.
  - Implemented `evaluateQueueNotificationsService(businessId, io)` triggering `TURN_APPROACHING` when `peopleAhead <= threshold` (default: 2 people ahead).
  - Implemented automatic `YOUR_TURN` notification trigger on transitioning status to `in_progress`.
  - Added authenticated personal socket rooms `user_${userId}` and targeted events on `queue_${ticketId}`.
  - Included `alert` metadata in `getTicketStatusService` and `getCustomerActiveQueuesService` responses.
  - Automated unit tests added to `queueService.test.ts` covering threshold triggers, deduplication persistence, and `YOUR_TURN` transition events.
- **Web Frontend Integration:**
  - Added browser Web Notification API permission banner on `/status/[id]`.
  - Implemented animated in-app alert card (`AnimatePresence`) for `TURN_APPROACHING` and `YOUR_TURN` with dismiss controls.
  - Added real-time socket listener on customer home page (`/`) and dynamic turn approaching badges on active ticket cards.
- **Mobile App Integration:**
  - Added `alert?: QueueAlertData` to mobile `QueueEntry` type.
  - Implemented in-app notification banner on `QueueStatusScreen.tsx` with haptic vibration feedback via `Vibration.vibrate`.
  - Added turn approaching alert pill in `CustomerHomeScreen.tsx` on active queue cards.
- **Verification Status: 🔵 VERIFIED**
  - All 30 automated backend tests pass across 4 suites (`npm test`).
  - Backend compiles with 0 errors (`npm run build`).
  - Web Next.js 16 (Turbopack) production build succeeds (`npm run build`).
  - Mobile TypeScript check compiles with 0 errors (`npx tsc --noEmit`).

---

### Phase 5 — Favourites & Quick Rebooking
- **Goal:** Allow frequent customers to bookmark stores and re-queue in seconds with live telemetry.
- **Backend:**
  - Added `favoriteBusinesses: [{ type: Schema.Types.ObjectId, ref: "User" }]` to `User` model and schema.
  - Implemented `toggleFavoriteService` with atomic `$addToSet` and `$pull` operations.
  - Implemented `getCustomerFavoritesService` returning live store operational status (`isOpen`, `openReason`, `activeQueueCount`, `estimatedWait`, `prediction`).
  - Implemented `quickRebookService` matching past ticket services against current store catalog and validating open hours.
  - Enriched `getStoreByQr` with optional token auth lookup returning `isFavorite: boolean` without client roundtrips.
  - Mounted `/api/queue/favorites`, `/api/queue/favorites/toggle`, `/api/queue/quick-rebook` and `/api/customer/*` route alias.
  - Automated unit tests in `queueService.test.ts` covering favorites toggling, closed store rejection, and past ticket rebooking.
- **Web Frontend:**
  - Added heart favourite toggle button with micro-animations in store header on `/store/[qrCode]`.
  - Added "Saved Stores" tab on customer home page (`/`) displaying live open/closed status, active queue count, estimated wait, and direct Queue Up action.
  - Added 1-click "Rebook" button in Booking History tab on customer home page calling `/api/queue/quick-rebook`.
- **Mobile App:**
  - Added `FavoriteStore` and `favoriteBusinesses` to mobile types.
  - Added heart favourite toggle button in store details header card on `ScanJoinScreen.tsx`.
  - Added "Saved" tab to segmented switcher on `CustomerHomeScreen.tsx` showing live store status, queue depth, and 1-tap Queue Up.
  - Added 1-tap "Rebook Services" button on past booking history cards.
- **Verification Status: 🔵 VERIFIED**
  - All 35 automated backend tests pass across 4 suites (`npm test`).
  - Backend compiles with 0 errors (`npm run build`).
  - Web Next.js 16 (Turbopack) production build succeeds (`npm run build`).
  - Mobile TypeScript check compiles with 0 errors (`npx tsc --noEmit`).

---

### Phase 6 — Merchant Analytics
- **Goal:** Empower merchants with actionable operational intelligence across web and mobile.
- **Backend:**
  - Created [`backend/src/services/analyticsService.ts`](file:///d:/Projects/Projects/QueueLess/backend/src/services/analyticsService.ts) (`getBusinessAnalyticsService`):
    - Computes `totalCustomers`, `totalCompleted`, `totalCancelled`, `totalActive`, `completionRate`, `totalRevenue`, `avgWaitTimeMin`, `avgServiceDurationMin`, and `serviceSpeedRatio`.
    - Generates zero-gap daily throughput time series for `today`, `7d`, `30d`, `all`, and custom date ranges.
    - Aggregates 24-hour peak counter arrival distribution with busiest hour window detection.
    - Computes ranked service popularity breakdown with volume, total revenue, and percentage of bookings.
  - Mounted `GET /api/business/analytics` in `businessRoutes.ts` with `getAnalytics` controller in `businessController.ts`.
  - Added unit test suite `analyticsService.test.ts` with 3 test cases covering zero-entry fallback, accurate averages, and date boundaries.
- **Web Frontend:**
  - Updated [`frontend/src/app/dashboard/page.tsx`](file:///d:/Projects/Projects/QueueLess/frontend/src/app/dashboard/page.tsx):
    - Added 3-tab navigation bar: "Live Counter", "Analytics & Insights", "Service Catalog".
    - Added time-range filter chips (`Today`, `7 Days`, `30 Days`, `All Time`).
    - 4 KPI cards with gradient indicators and speed ratio tags.
    - SVG/CSS daily throughput volume stacked bar chart with tooltips.
    - 24-hour peak counter arrival hours bar breakdown with busiest hour banner.
    - Ranked service popularity distribution with progress bars.
- **Mobile App:**
  - Added `AnalyticsSummary`, `DailyThroughputItem`, `PeakHourItem`, `ServicePopularityItem`, and `BusinessAnalytics` to `mobile/src/types.ts`.
  - Updated [`mobile/src/screens/business/BusinessDashboardScreen.tsx`](file:///d:/Projects/Projects/QueueLess/mobile/src/screens/business/BusinessDashboardScreen.tsx):
    - Added segmented control switcher: "Live Queue" (with active count badge), "Analytics", "Catalog".
    - Rich Analytics view with range filter chips, 4 KPI cards (Completed, Revenue, Avg Wait, Speed Ratio), Peak Counter Hours card with busiest window highlight, Service Popularity ranking with progress bars, and Daily Throughput list.
- **Verification Status: 🔵 VERIFIED**
  - All 38 automated backend tests pass across 5 suites (`npm test`).
  - Backend compiles with 0 errors (`npm run build`).
  - Web Next.js 16 (Turbopack) production build succeeds (`npm run build`) with 10/10 routes.
  - Mobile Expo TypeScript check compiles with 0 errors (`npx tsc --noEmit`).

---

### Phase 7 — Secure Shareable Queue Tickets
- **Goal:** Allow customers to share their live ticket tracking link safely with family/friends.
- **Backend:**
  - Generated 48-character cryptographically secure share tokens (`crypto.randomBytes(24).toString("hex")`).
  - Scoped public endpoint `GET /api/queue/shared/:shareToken`:
    - Exposes strictly non-sensitive fields: `ticketNumber`, `status`, `shopName`, `shopAddress`, `joinedAt`, `selectedServices`, `peopleAhead`, `currentEstimatedWait`, `estimatedServiceStartTime`, `prediction`.
    - Completely excludes any customer PII (no customer name, email, phone, or MongoDB user IDs).
  - Added `generateTicketShareTokenService`, `revokeTicketShareTokenService`, and `getSharedTicketService` in [`backend/src/services/queueService.ts`](file:///d:/Projects/Projects/QueueLess/backend/src/services/queueService.ts).
  - Added real-time Socket.IO synchronization on `shared_ticket_${token}` room for live ticket status updates (`shared_ticket_updated`) and instantaneous revocation (`ticket_share_revoked`).
  - Added unit test suite [`backend/src/__tests__/shareTicket.test.ts`](file:///d:/Projects/Projects/QueueLess/backend/src/__tests__/shareTicket.test.ts) with 7 test cases covering generation, length, unauthorized rejection, revocation, and zero-PII public lookup.
- **Web Frontend:**
  - Created guest-accessible [`frontend/src/app/shared/[token]/page.tsx`](file:///d:/Projects/Projects/QueueLess/frontend/src/app/shared/%5Btoken%5D/page.tsx) with real-time Socket.IO room subscription, live status updates, smart prediction display, and friendly revoked/not-found states.
  - Added "Share Live Ticket" modal with 1-click copy link and public link revocation to [`frontend/src/app/status/[id]/page.tsx`](file:///d:/Projects/Projects/QueueLess/frontend/src/app/status/%5Bid%5D/page.tsx).
- **Mobile App:**
  - Integrated native `Share.share` action sheet in [`mobile/src/screens/shared/QueueStatusScreen.tsx`](file:///d:/Projects/Projects/QueueLess/mobile/src/screens/shared/QueueStatusScreen.tsx).
  - Added public link active banner and 1-tap link revocation.
  - Added `SharedTicketData` and `shareToken` to [`mobile/src/types.ts`](file:///d:/Projects/Projects/QueueLess/mobile/src/types.ts).
- **Verification Status: 🔵 VERIFIED**
  - All 45 automated backend tests pass across 6 suites (`npm test`).
  - Backend compiles with 0 errors (`npm run build`).
  - Web Next.js 16 (Turbopack) production build succeeds (`npm run build`) with 11/11 routes.
  - Mobile Expo TypeScript check compiles with 0 errors (`npx tsc --noEmit`).

---

### Phase 8 — Production Scalability & Operational Maturity
- **Goal:** Harden infrastructure for high availability, observability, security, and clean operations.
- **Backend:**
  - Structured logging with JSON output in production, request correlation IDs (`X-Request-Id`), and clean test suppression in [`backend/src/utils/logger.ts`](file:///d:/Projects/Projects/QueueLess/backend/src/utils/logger.ts).
  - Deep Health Probes in [`backend/src/controllers/healthController.ts`](file:///d:/Projects/Projects/QueueLess/backend/src/controllers/healthController.ts) and [`backend/src/routes/healthRoutes.ts`](file:///d:/Projects/Projects/QueueLess/backend/src/routes/healthRoutes.ts):
    - `/health/live`: Liveness probe for process responsiveness and event loop monitoring.
    - `/health/ready`: Readiness probe verifying MongoDB connectivity (`readyState === 1`) and draining status (returns 503 during graceful shutdown).
    - `/health`: Backward-compatible summary telemetry probe.
  - Multi-tiered Rate Limiting with `express-rate-limit` in [`backend/src/middleware/rateLimiter.ts`](file:///d:/Projects/Projects/QueueLess/backend/src/middleware/rateLimiter.ts):
    - `authRateLimiter`: 30 attempts / 15 mins to mitigate brute-force attacks.
    - `queueMutationRateLimiter`: 30 mutations / 1 min preventing queue booking/cancellation flood abuse.
    - `sharedTicketRateLimiter`: 60 lookups / 1 min protecting public shared links.
    - `generalApiRateLimiter`: 300 requests / 1 min baseline API protection.
  - Graceful Shutdown Engine in [`backend/src/index.ts`](file:///d:/Projects/Projects/QueueLess/backend/src/index.ts):
    - Intercepts `SIGINT`, `SIGTERM`, and `uncaughtException`.
    - Triggers draining state, closes HTTP server, cleanly disconnects Socket.IO sockets, and terminates MongoDB connection with a 10s watchdog timeout.
  - Production Security Headers in [`backend/src/app.ts`](file:///d:/Projects/Projects/QueueLess/backend/src/app.ts):
    - `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Strict-Transport-Security`, and disabled `X-Powered-By`.
  - Operational Documentation:
    - Created [`docs/OPERATIONS.md`](file:///d:/Projects/Projects/QueueLess/docs/OPERATIONS.md) detailing architecture topography, Kubernetes probe configurations, rate limiting policies, zero-downtime rolling restart sequences, and MongoDB backup & disaster recovery (`mongodump` & `mongorestore`).
- **Verification Status: 🔵 VERIFIED**
  - All 51 automated backend tests pass across 6 suites (`npm test`).
  - Backend compiles with 0 errors (`npm run build`).
  - Web Next.js 16 (Turbopack) production build succeeds (`npm run build`) with 11/11 routes.
  - Mobile Expo TypeScript check compiles with 0 errors (`npx tsc --noEmit`).
