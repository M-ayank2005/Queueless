# 🚀 QueueLess — Modern Real-Time Virtual Queue System

QueueLess is an end-to-end, real-time virtual queue management platform designed to eliminate physical waiting lines across retail, salons, healthcare, and service counters. Customers join queues remotely via QR codes with dynamic wait-time predictions, while businesses manage counter throughput with live telemetry and operational analytics.

---

## ✨ Features & Architecture

### 🏪 For Businesses (Web & Mobile Dashboard)
- **Top QR Code & Flyer Generator**: Quick-access QR flyer with printable/downloadable landscape preview.
- **Live Counter & Processed Customers**: Real-time counter management with live status transitions (`waiting` ➔ `in_progress` ➔ `completed` / `cancelled`) and recent processed customer audit trail.
- **Merchant Analytics & Insights**: Aggregated KPIs (volume, revenue, completion rate, average wait/service duration, speed ratio), zero-gap daily throughput time series, 24-hour peak counter arrival distribution, and service popularity breakdowns.
- **Service Catalog & Hours Configuration**: Dynamic services setup with durations, costs, and timezone-aware operating hours.

### 👤 For Customers (Web & Mobile App)
- **Scan & Join**: Instant queue enrollment without mandatory app download; scan store QR code to view live status.
- **Smart Wait Predictions**: Adaptive prediction engine factoring counter pace ratios with confidence scoring and dynamic ranges (e.g. `~15–20 mins`).
- **Turn-Approaching Notifications**: Milestone alerts when your turn approaches (with desktop browser alerts, animated in-app cards, and mobile haptic vibrations).
- **Favourites & 1-Click Rebooking**: Bookmark favorite stores with live queue depth indicators and re-queue in seconds.
- **Secure Shareable Queue Tickets**: Cryptographic share links with strict **Zero PII Leakage** (customer name/email/phone stripped), SHA-256 hashed storage, 24-hour expiration, and real-time revocation.

---

## 🛠️ Technology Stack

| Platform | Technology | Versions & Libraries |
|---|---|---|
| **Web Frontend** | Next.js (App Router), React, TypeScript | Next.js 16.1 (Turbopack), React 19, Tailwind CSS, Framer Motion, Lucide React |
| **Mobile App** | React Native, Expo, TypeScript | Expo SDK 57, React Native 0.86, React Navigation 6, Axios |
| **Backend API** | Node.js, Express, TypeScript | Express 4, Mongoose 8, Socket.IO 4, JWT, Bcrypt |
| **Database** | MongoDB | MongoDB 6.0+ with partial unique indexes & compound query indexing |
| **Observability** | Structured Logging & RFC Probes | Structured JSON logger, Request Correlation (`X-Request-Id`), `/health/live`, `/health/ready` |
| **Security** | Defense-in-Depth | Fail-closed auth, token role validation, rate limiting (`express-rate-limit`), fail-closed CORS, helmet-grade security headers |

---

## ⚙️ Quick Start & Local Development

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017/queueless`) or MongoDB Atlas URI

### 2. Clone & Environment Setup
```bash
git clone https://github.com/M-ayank2005/Queueless.git
cd Queueless
```

#### Backend Setup (`backend/`)
```bash
cd backend
npm install
cp .env.example .env # Ensure JWT_SECRET and MONGO_URI are configured
npm run dev          # Starts server on http://localhost:5000
```

#### Frontend Setup (`frontend/`)
```bash
cd ../frontend
npm install
npm run dev          # Starts Next.js 16 dev server on http://localhost:3000
```

#### Mobile App Setup (`mobile/`)
```bash
cd ../mobile
npm install
npx expo start       # Starts Expo development bundler
```

---

## 🧪 Testing & Verification

Run tests independently across each package:

```bash
# Backend Automated Tests (Jest + ts-jest + Supertest)
cd backend
npm test             # Executes all unit, concurrency, and security suites
npm run build        # Verifies clean TypeScript compilation

# Web Frontend Lint & Build
cd ../frontend
npm run build        # Generates production Next.js 16 Turbopack bundle

# Mobile App Typecheck
cd ../mobile
npx tsc --noEmit     # Validates TypeScript types across React Native components
```

---

## 📖 Operational Documentation & Runbooks
- **Roadmap & Phase Tracking:** [`docs/ROADMAP.md`](docs/ROADMAP.md)
- **Operations & Disaster Recovery Runbook:** [`docs/OPERATIONS.md`](docs/OPERATIONS.md)
- **Architecture Specification:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **API & WebSocket Contract:** [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md)
