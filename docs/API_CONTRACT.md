# QueueLess — REST API Contract Documentation

## Standard Headers
- `Content-Type: application/json`
- `Authorization: Bearer <JWT_TOKEN>` (for protected endpoints)
- `X-Request-Id: <UUID>` (returned on all responses for tracing)

## Standard Error Response Shape
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED | VALIDATION_ERROR | NOT_FOUND | CONFLICT | INTERNAL_ERROR",
    "message": "Human-readable error description",
    "details": [] 
  }
}
```

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "password": "StrongPassword123!",
    "role": "customer | business",
    "businessName": "John's Salon (required if role is business)",
    "address": "123 Main St (required if role is business)"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "user": { "id": "...", "name": "...", "email": "...", "role": "..." },
    "token": "eyJhbGciOi..."
  }
  ```

### `POST /api/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  { "email": "user@example.com", "password": "password" }
  ```
- **Response `200 OK`:**
  ```json
  {
    "user": { "id": "...", "name": "...", "email": "...", "role": "..." },
    "token": "eyJhbGciOi..."
  }
  ```

### `GET /api/auth/profile`
- **Access:** Protected (`customer` or `business`)
- **Response `200 OK`:** Full profile without password hash.

---

## 2. Business Endpoints (`/api/business`)

### `GET /api/business/me`
- **Access:** Protected (`role: business`)
- **Response `200 OK`:** Business profile, QR code, working hours, and services catalog.

### `PUT /api/business/services`
- **Access:** Protected (`role: business`)
- **Request Body:**
  ```json
  {
    "services": [
      { "name": "Haircut", "durationMin": 30, "cost": 25 }
    ]
  }
  ```

### `GET /api/business/queue`
- **Access:** Protected (`role: business`)
- **Response `200 OK`:** Active queue entries (`waiting`, `in_progress`) followed by recent 10 processed entries.

### `PUT /api/business/queue/:id/status`
- **Access:** Protected (`role: business` owning the ticket)
- **Request Body:**
  ```json
  { "status": "in_progress | completed | cancelled" }
  ```

---

## 3. Queue Endpoints (`/api/queue`)

### `GET /api/queue/store/:qrCode`
- **Access:** Public
- **Response `200 OK`:** Store public profile, shop name, address, services, and current open/closed status.

### `POST /api/queue/join`
- **Access:** Protected (`role: customer`)
- **Request Body:**
  ```json
  {
    "businessId": "65b...",
    "selectedServices": [
      { "name": "Haircut", "durationMin": 30, "cost": 25 }
    ]
  }
  ```
- **Response `201 Created`:** Created `QueueEntry` with assigned position and wait time.

### `GET /api/queue/status/:id`
- **Access:** Protected (Requester must be the customer who booked or the business merchant)
- **Response `200 OK`:**
  ```json
  {
    "_id": "65b...",
    "businessId": { "shopName": "...", "address": "..." },
    "status": "waiting",
    "peopleAhead": 2,
    "currentEstimatedWait": 45,
    "joinedAt": "2026-10-16T10:00:00.000Z"
  }
  ```

### `GET /api/queue/my-queues`
- **Access:** Protected (`role: customer`)
- **Response `200 OK`:** List of active queues with dynamic positions and wait estimates.

### `GET /api/queue/history`
- **Access:** Protected (`role: customer`)
- **Response `200 OK`:** Completed or cancelled tickets.
