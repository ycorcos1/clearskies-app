# ClearSkies Database Schema

## Firestore Collections Overview

This document describes the normalized database schema for ClearSkies, showing all collections, their relationships, and key fields.

---

## Collections

### 1. `students` Collection

**Purpose**: Stores student/pilot profile information and notification preferences.

**Document ID**: `{userId}` (Firebase Auth UID)

**Fields**:

```typescript
{
  id: string                    // Firebase Auth UID
  name: string                  // Full name
  email: string                 // Email address
  phone: string                 // Phone number (formatted)
  trainingLevel: "student" | "private" | "instrument"
  createdAt: Timestamp
  settings?: {
    notifications: {
      emailWeatherAlerts: boolean
      emailReschedule: boolean
      emailWeatherImproved: boolean
      inAppToasts: boolean
    }
    theme: "light" | "dark"
    updatedAt?: Timestamp
  }
}
```

**Indexes**:

- `trainingLevel` (ASC) + `createdAt` (DESC)

**Relationships**:

- One-to-many with `bookings` (via `studentId`)

---

### 2. `bookings` Collection

**Purpose**: Stores flight booking information, weather status, and scheduling details.

**Document ID**: Auto-generated (e.g., `booking-001`, `demo-booking-{userId}-{timestamp}-{index}`)

**Fields**:

```typescript
{
  id: string
  studentId: string             // References students.id
  studentName: string           // Denormalized for quick access
  trainingLevel?: "student" | "private" | "instrument"
  scheduledDate: string         // ISO date format (YYYY-MM-DD)
  scheduledTime: string         // Time format (e.g., "09:00 AM")
  departureLocation: {
    name: string                // Airport name
    lat: number                 // Latitude
    lon: number                 // Longitude
  }
  status: "scheduled" | "cancelled" | "completed"
  weatherStatus?: "safe" | "caution" | "unsafe"
  lastWeatherCheck?: Timestamp
  lastModified?: Timestamp
  createdAt: Timestamp
}
```

**Indexes**:

- `studentId` (ASC) + `status` (ASC) + `scheduledDate` (ASC) + `scheduledTime` (ASC)
- `studentId` (ASC) + `status` (ASC) + `weatherStatus` (ASC) + `scheduledDate` (ASC) + `scheduledTime` (ASC)
- `status` (ASC) + `scheduledDate` (ASC)

**Relationships**:

- Many-to-one with `students` (via `studentId`)
- One-to-many with `bookings/{id}/aiReschedules` (subcollection)

---

### 3. `bookings/{bookingId}/aiReschedules` Subcollection

**Purpose**: Stores AI-generated reschedule suggestions for a specific booking.

**Document ID**: Auto-generated

**Fields**:

```typescript
{
  id: string
  explanation: string            // AI explanation of why reschedule is needed
  suggestions: Array<{
    date: string                 // Suggested date (YYYY-MM-DD)
    time: string                   // Suggested time (e.g., "10:00 AM")
    reason: string                 // AI reasoning for this option
  }>                              // Always exactly 3 suggestions
  trainingLevel?: "student" | "private" | "instrument"
  violations?: string[]           // Weather violations that triggered this
  createdAt: Timestamp
}
```

**Indexes**:

- `createdAt` (DESC) - default query ordering

**Relationships**:

- Many-to-one with `bookings` (parent document)

---

### 4. `notificationQueue` Collection

**Purpose**: Queue for pending email notifications with retry logic.

**Document ID**: `{bookingId}-{type}-{channel}` (composite key)

**Fields**:

```typescript
{
  bookingId: string              // References bookings.id
  studentId: string              // References students.id
  type: "weather_alert" | "reschedule_confirmation" | "weather_improved"
  channel: "email"
  status: "pending" | "processing" | "sent" | "failed"
  attempts: number               // Retry attempt count (max 3)
  scheduledAt: Timestamp         // When to process (for retries)
  createdAt: Timestamp
  updatedAt: Timestamp
  payload: {
    studentName?: string
    trainingLevel?: string
    scheduledDate?: string
    scheduledTime?: string
    locationName?: string
    violations?: string[]
    aiExplanation?: string
    rescheduleOptions?: Array<{
      date: string
      time: string
      reason: string
    }>
    actionUrl?: string
    studentEmail?: string
  }
  lastError?: string             // Error message if failed
}
```

**Indexes**:

- `status` (ASC) + `scheduledAt` (ASC)

**Relationships**:

- Many-to-one with `bookings` (via `bookingId`)
- Many-to-one with `students` (via `studentId`)

---

### 5. `notificationEvents` Collection

**Purpose**: Audit log of all notification attempts (successful and failed).

**Document ID**: Auto-generated

**Fields**:

```typescript
{
  type: "weather_alert" | "reschedule_confirmation" | "weather_improved"
  channel: "email"
  bookingId: string              // References bookings.id
  studentId: string              // References students.id
  status: "sent" | "failed"
  attempt: number                // Which retry attempt
  messageId?: string             // Email message ID (if successful)
  errorMessage?: string          // Error details (if failed)
  createdAt: Timestamp
}
```

**Indexes**: None (queries are typically by `bookingId` or `studentId` with timestamp)

**Relationships**:

- Many-to-one with `bookings` (via `bookingId`)
- Many-to-one with `students` (via `studentId`)

---

### 6. `errorLogs` Collection

**Purpose**: System error tracking for debugging and monitoring.

**Document ID**: Auto-generated

**Fields**:

```typescript
{
  type: "weather_api" | "openai_api" | "firestore" | "notification"
  message: string
  bookingId?: string             // Optional reference
  studentId?: string             // Optional reference
  retryCount?: number
  resolved: boolean
  timestamp: Timestamp
}
```

**Indexes**:

- `type` (ASC) + `timestamp` (DESC)
- `resolved` (ASC) + `timestamp` (DESC)

**Relationships**:

- Optional many-to-one with `bookings` (via `bookingId`)
- Optional many-to-one with `students` (via `studentId`)

---

## Entity Relationship Diagram

```
┌─────────────────┐
│    students     │
│─────────────────│
│ id (PK)         │
│ name            │
│ email           │
│ phone           │
│ trainingLevel   │
│ settings        │
│ createdAt       │
└────────┬────────┘
         │
         │ 1:N
         │
         ▼
┌─────────────────┐
│    bookings     │
│─────────────────│
│ id (PK)         │
│ studentId (FK)  │──┐
│ studentName     │  │
│ trainingLevel   │  │
│ scheduledDate   │  │
│ scheduledTime   │  │
│ departureLoc    │  │
│ status          │  │
│ weatherStatus   │  │
│ lastWeatherCheck│  │
│ createdAt       │  │
└────────┬────────┘  │
         │            │
         │ 1:N        │
         │            │
         ▼            │
┌─────────────────┐  │
│ aiReschedules   │  │
│ (subcollection) │  │
│─────────────────│  │
│ id (PK)         │  │
│ explanation     │  │
│ suggestions[]   │  │
│ trainingLevel   │  │
│ violations[]    │  │
│ createdAt       │  │
└─────────────────┘  │
                     │
         ┌───────────┘
         │
         ▼
┌─────────────────┐
│notificationQueue│
│─────────────────│
│ id (PK)         │
│ bookingId (FK)  │──┐
│ studentId (FK)  │──┼──┐
│ type            │  │  │
│ channel         │  │  │
│ status          │  │  │
│ attempts        │  │  │
│ scheduledAt     │  │  │
│ payload         │  │  │
│ createdAt       │  │  │
└────────┬────────┘  │  │
         │           │  │
         │ 1:N       │  │
         │           │  │
         ▼           │  │
┌─────────────────┐  │  │
│notificationEvents│ │  │
│─────────────────│ │  │
│ id (PK)         │ │  │
│ bookingId (FK)  │─┘  │
│ studentId (FK)  │────┘
│ type            │
│ channel         │
│ status          │
│ attempt         │
│ messageId       │
│ errorMessage    │
│ createdAt       │
└─────────────────┘

┌─────────────────┐
│   errorLogs     │
│─────────────────│
│ id (PK)         │
│ type            │
│ message         │
│ bookingId (FK?) │──┐
│ studentId (FK?) │──┼──┐
│ retryCount      │  │  │
│ resolved        │  │  │
│ timestamp       │  │  │
└─────────────────┘  │  │
                     │  │
                     └──┴── (optional references)
```

---

## Query Patterns

### Common Queries

1. **Get upcoming flights for a student**:

   ```typescript
   bookings
     .where("studentId", "==", userId)
     .where("status", "==", "scheduled")
     .orderBy("scheduledDate")
     .orderBy("scheduledTime");
   ```

2. **Get weather alerts for a student**:

   ```typescript
   bookings
     .where("studentId", "==", userId)
     .where("status", "==", "scheduled")
     .where("weatherStatus", "in", ["caution", "unsafe"])
     .orderBy("scheduledDate")
     .orderBy("scheduledTime");
   ```

3. **Get scheduled flights for weather check**:

   ```typescript
   bookings
     .where("status", "==", "scheduled")
     .where("scheduledDate", ">=", startDate)
     .where("scheduledDate", "<=", endDate);
   ```

4. **Get pending notifications**:

   ```typescript
   notificationQueue
     .where("status", "==", "pending")
     .where("scheduledAt", "<=", now)
     .limit(20);
   ```

5. **Get AI reschedule history**:
   ```typescript
   bookings /
     { bookingId } /
     aiReschedules.orderBy("createdAt", "desc").limit(5);
   ```

---

## Normalization Strategy

### Denormalized Fields

- `bookings.studentName` - Denormalized from `students.name` for quick access without joins
- `bookings.trainingLevel` - Denormalized from `students.trainingLevel` for weather evaluation

### Why Denormalization?

Firestore doesn't support joins, so denormalizing frequently accessed data improves query performance and reduces read costs.

---

## Data Consistency

- **Student updates**: When a student's name or training level changes, related bookings are updated via Cloud Functions triggers (if needed)
- **Booking status**: Status changes trigger notification queue entries
- **Weather updates**: Weather status changes trigger notifications if status becomes "unsafe"

---

## Security Rules

See `firestore.rules` for detailed security rules. Key principles:

- Students can only read/write their own data
- Bookings are readable by the student who owns them
- Notification queue is write-only for functions, read-only for students
- Error logs are read-only for all authenticated users
