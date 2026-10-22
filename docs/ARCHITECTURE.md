# QueueLess — System Architecture Documentation

## 1. System Overview
QueueLess is a real-time virtual queue management platform consisting of three coordinated applications:
- **Backend (`/backend`)**: Express, TypeScript, MongoDB (Mongoose), Socket.IO.
- **Web Frontend (`/frontend`)**: Next.js 16 (Turbopack, App Router), React 19, Tailwind CSS, Framer Motion.
- **Mobile App (`/mobile`)**: Expo SDK 57, React Native 0.86, TypeScript.

```mermaid
graph TD
    ClientWeb["Web Client (Next.js 16)"] -->|REST API + Bearer JWT| Backend["Express API + Socket.IO Server"]
    ClientWeb -->|WebSocket / WSS| Backend
    ClientMobile["Mobile App (Expo RN)"] -->|REST API + Bearer JWT| Backend
    ClientMobile -->|WebSocket / WSS| Backend
    Backend -->|Mongoose ODM| Mongo["MongoDB Database"]
```

---

## 2. Component Hierarchy & Responsibilities

### 2.1 Backend Architecture
```
backend/src/
├── controllers/          # HTTP request handlers (thin orchestrators)
│   ├── authController.ts
│   ├── businessController.ts
│   └── queueController.ts
├── services/             # Core business logic (centralized, reusable)
│   └── queueService.ts   # authoritative queue & wait time engine
├── middleware/           # Cross-cutting concerns
│   ├── authMiddleware.ts # JWT verification & role enforcement
│   ├── validation.ts     # Schema validation for request payloads
│   └── errorHandler.ts   # Centralized error formatter & request ID
├── models/               # MongoDB Mongoose schemas
│   ├── User.ts           # Customer & Business accounts
│   ├── QueueEntry.ts     # Tickets & status history
│   └── ShareToken.ts     # Scoped public sharing tokens (Phase 7)
├── routes/               # API endpoint routing definitions
└── index.ts              # Server bootstrap, Socket.IO & database connection
```

### 2.2 Queue Lifecycle State Machine
```mermaid
stateDiagram-v2
    [*] --> waiting: joinQueue()
    waiting --> in_progress: callCustomer()
    waiting --> cancelled: cancelTicket()
    in_progress --> completed: completeService()
    in_progress --> cancelled: cancelTicket()
    completed --> [*]
    cancelled --> [*]
```
- **Disallowed Transitions:**
  - `completed` -> `waiting` (cannot revive finished tickets)
  - `cancelled` -> `in_progress` (cancelled tickets are terminal)
  - `waiting` -> `completed` (must be marked `in_progress` before completion)

---

## 3. Real-Time Synchronization Protocol

### 3.1 Socket Rooms
- `business_{businessId}`: Authenticated room for the business merchant. Receives `queue_updated` when customers join or change position.
- `queue_{queueEntryId}`: Private room for a specific ticket. Authorized strictly to the ticket owner or merchant. Receives `status_updated`.
- `user_{userId}`: User-specific private room receiving real-time `notification:new` alerts.

### 3.2 Resilience & Reconciliation
Socket.IO is used as a fast notification layer. MongoDB remains the authoritative source of truth.
Clients execute REST fetches on screen focus or visibility restoration to reconcile state.

---

## 4. Notifications & Updates Feed Subsystem

```mermaid
graph LR
    Event["Queue State Transition (Join, Advance, Verify, Complete)"] --> Service["queueService.ts"]
    Service --> NotifService["notificationService.ts"]
    NotifService --> DB[(MongoDB Collections: notifications, updates)]
    NotifService --> Push["Expo Push Service (Part C)"]
    NotifService --> Socket["Socket.IO user_{userId}"]
```

### 4.1 Coalescing & Deduplication
- **Dedupe Keys:**
  - `joined:{queueId}`
  - `turn_near:{queueId}`
  - `your_turn:{queueId}`
  - `checked_in:{queueId}`
  - `completed:{queueId}`
  - `cancelled:{queueId}`
- **Queue Movement Coalescing:** For tickets ahead that move, `queue_updated:{queueId}` is upserted in place with new `meta.position` and `meta.waitMin` instead of generating multiple notifications per ticket.

### 4.2 Announcement Visibility Rule
Customers only see announcements from businesses:
1. Marked as favorites (`favoriteBusinesses`), OR
2. Where the customer has booked a ticket within the previous 30 days.

---

## 5. Mobile Client Architecture (`/mobile`)

- **View Geometry:** 390x844 responsive flexbox design system.
- **Navigation:**
  - `AuthNavigator`: Splash -> Onboarding (if first time) -> Login <-> Register.
  - `CustomerTabsNavigator`: Home, Notifications (with unread badge), Updates, My Queue.
  - `BusinessTabsNavigator`: Dashboard, Profile.
  - `RootStack`: ScanJoin (Store Detail), Profile, QueueStatus, History, Help, Legal.
- **Design Tokens:** Strictly centralized in `src/theme/colors.ts` and `src/theme/theme.ts`.
