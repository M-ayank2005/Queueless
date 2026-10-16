# 🛠️ QueueLess — Production Operations & Reliability Runbook

This runbook documents operational procedures, health checks, rate limiting policies, log tracing, and backup/restore workflows for QueueLess.

---

## 🏗️ 1. Architecture & Operational Topography

QueueLess comprises:
- **Backend Service (`backend/`)**: Node.js/TypeScript Express server with Socket.IO running behind a reverse proxy (e.g. Nginx, Cloudflare, AWS ALB).
- **Database**: MongoDB 6.0+ cluster with replica set.
- **Web Frontend (`frontend/`)**: Next.js 16 (App Router) client with static and dynamic server components.
- **Mobile Client (`mobile/`)**: React Native / Expo application with direct REST and Socket.IO interfaces.

```
       [Client Traffic: Web / Mobile]
                     │
         [Cloudflare / Ingress / ALB]
         (Injects X-Request-Id header)
                     │
           ┌─────────┴─────────┐
           ▼                   ▼
    [App Instance 1]    [App Instance 2]
    Express + Socket.IO  Express + Socket.IO
           │                   │
           └─────────┬─────────┘
                     │
            [MongoDB Replica Set]
```

---

## 🩺 2. Health & Readiness Probes

The backend exposes standardized RFC-compliant health probes under `/health`:

| Endpoint | HTTP Method | Expected Status | Purpose | Cloud Orchestrator Usage |
|---|---|---|---|---|
| `/health/live` | `GET` | `200 OK` | Liveness: Verifies process responsiveness & event loop | Kubernetes `livenessProbe` / ECS Health Check |
| `/health/ready` | `GET` | `200 OK` (or `503 Service Unavailable`) | Readiness: Verifies database connectivity & draining state | Kubernetes `readinessProbe` / ALB Target Health |
| `/health` | `GET` | `200 OK` | Comprehensive system telemetry summary | Monitoring dashboards / synthetic uptime checks |

### Probe Response Specifications

#### 🟢 Liveness Check (`GET /health/live`)
```json
{
  "status": "alive",
  "uptime": 84210,
  "timestamp": "2026-10-17T00:15:00.000Z"
}
```

#### 🟢 Readiness Check — Healthy (`GET /health/ready` -> `200 OK`)
```json
{
  "status": "ready",
  "database": {
    "status": "connected",
    "readyState": 1
  },
  "draining": false,
  "uptime": 84210,
  "memory": {
    "heapUsedMb": 64,
    "rssMb": 118
  },
  "timestamp": "2026-10-17T00:15:00.000Z"
}
```

#### 🔴 Readiness Check — Unhealthy / Draining (`GET /health/ready` -> `503 Service Unavailable`)
```json
{
  "status": "not_ready",
  "database": {
    "status": "disconnected",
    "readyState": 0
  },
  "draining": true,
  "uptime": 84215,
  "memory": {
    "heapUsedMb": 68,
    "rssMb": 122
  },
  "timestamp": "2026-10-17T00:15:05.000Z"
}
```

### Kubernetes Pod Spec Example

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 5000
  initialDelaySeconds: 10
  periodSeconds: 15
  timeoutSeconds: 3
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/ready
    port: 5000
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 2
```

---

## 🛡️ 3. Rate Limiting Policies

To prevent denial-of-service, brute force credential attacks, and spamming, four specialized rate limiters protect the API:

| Limiter | Target Endpoints | Window | Max Requests | Response Code & Behavior |
|---|---|---|---|---|
| `authRateLimiter` | `POST /api/auth/register`<br>`POST /api/auth/login` | 15 mins | 30 per IP | `429 Too Many Requests` — Prevents credential brute-forcing |
| `queueMutationRateLimiter` | `POST /api/queue/join`<br>`POST /api/queue/cancel`<br>`POST /api/queue/quick-rebook` | 1 min | 30 per IP | `429 Too Many Requests` — Prevents queue flooding |
| `sharedTicketRateLimiter` | `GET /api/queue/shared/:shareToken` | 1 min | 60 per IP | `429 Too Many Requests` — Prevents token scraping |
| `generalApiRateLimiter` | `/api/*` | 1 min | 300 per IP | `429 Too Many Requests` — Baseline cluster protection |

*Note: Rate limiting automatically bypasses when `NODE_ENV === "test"` to ensure deterministic automated testing.*

---

## 🔄 4. Graceful Shutdown & Zero-Downtime Deployment

When a container orchestrator terminates an instance (deploying a new revision, auto-scaling in, or node maintenance), it sends a `SIGTERM` signal.

The QueueLess backend executes the following shutdown sequence:

1. **Mark Server Draining**: `setServerDraining(true)` causes `/health/ready` to immediately return `503 Service Unavailable`.
2. **Traffic Evacuation**: The load balancer removes the instance from active target groups; no new requests are forwarded.
3. **HTTP Server Closure**: `server.close()` stops accepting new connections while completing existing in-flight requests.
4. **Socket.IO Clean Disconnect**: All active connected sockets are disconnected cleanly (`io.disconnectSockets(true)`).
5. **Database Disconnect**: `mongoose.connection.close(false)` closes database pools without abrupt socket drops.
6. **Graceful Exit**: Process terminates with exit code `0`. A 10-second watchdog timer guarantees termination if an external resource hangs.

---

## 🔍 5. Structured Logging & Request Correlation

Every HTTP request is assigned a unique `X-Request-Id`:
- If provided by client/load-balancer (`X-Request-Id: <id>`), it is preserved.
- If omitted, a cryptographically random correlation ID is generated (`req_<timestamp>_<hex>`).
- The `X-Request-Id` is echoed in all response headers and embedded in 404/500 error bodies.

### Production JSON Log Output Sample:
```json
{"timestamp":"2026-10-17T00:12:00.123Z","level":"INFO","message":"GET /api/queue/my-queues 200 14ms","requestId":"req_1729123920123_8a3f91","method":"GET","path":"/api/queue/my-queues","statusCode":200,"durationMs":14}
```

---

## 💾 6. Database Backup & Disaster Recovery Runbook

### Prerequisites
- Tools: `mongodump`, `mongorestore` (from MongoDB Database Tools)
- Environment variable: `MONGO_URI`

### 1. Daily Automated Snapshot (Backup)
```bash
# Set timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backups/mongodb"

# Dump entire database with gzip compression
mongodump --uri="${MONGO_URI}" --gzip --archive="${BACKUP_DIR}/queueless_backup_${TIMESTAMP}.gz"

# Verify archive existence and size
ls -lh "${BACKUP_DIR}/queueless_backup_${TIMESTAMP}.gz"
```

### 2. Full Restoration (Disaster Recovery)
```bash
BACKUP_FILE="/backups/mongodb/queueless_backup_20261017_000000.gz"

# Restore database (with drop to ensure exact state replication)
mongorestore --uri="${MONGO_URI}" --gzip --archive="${BACKUP_FILE}" --drop

# Verify restored counts
mongosh "${MONGO_URI}" --eval "db.users.countDocuments(); db.queueentries.countDocuments();"
```

---

## ⚙️ 7. Environment Variables Reference

| Variable | Required in Prod? | Default (Dev) | Description |
|---|---|---|---|
| `PORT` | Optional | `5000` | Port for the HTTP & WebSocket server |
| `NODE_ENV` | Recommended | `development` | Environment mode (`production`, `development`, `test`) |
| `MONGO_URI` | Required | `mongodb://localhost:27017/queueless` | MongoDB connection connection string |
| `JWT_SECRET` | **REQUIRED** in Prod | *(Unset in prod causes immediate crash)* | 256-bit secret for signing auth tokens |
| `ALLOWED_ORIGINS` | Recommended | `*` | Comma-delimited list of allowed CORS origins |
| `DEBUG` | Optional | `false` | Enable verbose debug logging |
