# ClearSkies — Product Requirements Document (PRD)

## 1. Overview

**Product Name:** ClearSkies  
**Tagline:** _AI-powered weather intelligence for safer, smarter flight training._  
**Goal:** Automate flight scheduling adjustments based on real-time weather conditions using deterministic safety logic and AI-powered messaging.

ClearSkies helps flight schools minimize weather disruptions by automatically detecting unsafe conditions, alerting instructors and students, and generating AI-recommended reschedule options based on training level, weather minimums, and availability.

---

## 2. Core Objectives

The primary goals are to automate, optimize, and track the entire weather-related flight disruption process:

- **Automate** weather monitoring and flight conflict detection.
- **Notify** affected students in **real-time**.
- **Generate** AI-powered rescheduling options that consider student training levels and availability.
- **Track** all booking, cancellation, and reschedule data for analysis.
- **Display** active flight and weather alerts in a central React dashboard.
- **Document** the AI-assisted development process in a structured **AI Log** file.

---

## 3. Success Criteria

The project will be considered successful when **all** the following are met:

- ✅ **Weather conflicts** are automatically and accurately detected.
- ✅ **Notifications** are successfully sent to all affected students.
- ✅ **AI** suggests optimal rescheduling times (e.g., 3 valid options).
- ✅ **Database** accurately updates bookings and logs all reschedule actions.
- ✅ **Dashboard** displays live weather alerts and current flight statuses.
- ✅ **AI logic** correctly considers the student's **training level** (e.g., stricter limits for Student Pilots).
- ✅ **AI Log** is generated and maintained automatically to document project progress, prompt usage, and PR task summaries.

---

## 4. Technical Stack

| Layer                      | Technology                                                          |
| -------------------------- | ------------------------------------------------------------------- |
| **Frontend**               | React (Next.js, TypeScript, TailwindCSS)                            |
| **Backend**                | Firebase Functions (TypeScript)                                     |
| **Database**               | Firebase Firestore (NoSQL)                                          |
| **AI**                     | OpenAI API (for generating reschedule recommendations and messages) |
| **APIs**                   | WeatherAPI.com (real-time weather data)                             |
| **Auth**                   | Firebase Authentication (email/password)                            |
| **Scheduler**              | Firebase Cloud Scheduler (hourly weather checks)                    |
| **Deployment**             | Vercel (frontend) + Firebase (backend functions)                    |
| **Environment Management** | `.env.local` and Firebase `functions:config:set`                    |

---

## 5. System Architecture

**Architecture Flow:**

1. Firebase Cloud Scheduler triggers hourly weather checks.
2. Backend calls WeatherAPI for current weather conditions for all scheduled flights.
3. Logic determines flight risk using **training level + weather minimums**.
4. Unsafe flights are flagged and stored in Firestore.
5. OpenAI API generates rescheduling options + explanatory messages.
6. Notifications (email + in-app) sent to affected users.
7. Frontend dashboard auto-updates with live alerts and reschedules.
8. AI Log file continuously records each PR (task) summary, major prompts, and system decisions.

**Core Components:**

- `/api/weatherCheck` → Periodic weather validation.
- `/api/reschedule` → AI recommendation endpoint.
- `/api/notifications` → Firebase + email notifications.
- `/dashboard` → Displays flight, weather, and alert data.
- `/logs/ai-log.md` → Single file documenting AI-assisted build process.

---

## 6. AI Log Specification

Cursor must automatically maintain a single file named **`ai-log.md`** in the project root or `/docs` folder.

### Purpose

To document and showcase the entire AI-driven development workflow.

### Requirements

- Must include **timestamped entries** for each PR (task).
- Each entry must contain:
  - **Prompt Summary** — what was requested and how it was framed.
  - **AI Strategy** — reasoning, context, and approach used.
  - **Task Output Summary** — what was built or updated.
  - **Next Steps** (if any).
- Must be updated automatically at the completion of each PR/task.
- Must include an **intro section** explaining the AI-assisted development approach for the ClearSkies project.

Example Structure:

```
# AI Log — ClearSkies

## Overview
This document tracks all AI-assisted PR tasks, prompt strategies, and decision summaries generated during the ClearSkies project build.

---

### PR #1 — Firebase Environment Setup
**Date:** Nov 7, 2025
**Prompt Summary:** Setup Firebase backend and connect Firestore.
**AI Strategy:** Used CLI automation + modular config.
**Task Output:** Functions deployed successfully.
**Next Steps:** Implement Scheduler.

---
```

---

## 7. Database Schema & Mock Data

### Firestore Collections

**Students Collection:**

```typescript
{
  id: string;
  name: string;
  email: string;
  phone: string;
  trainingLevel: "student" | "private" | "instrument";
  createdAt: Timestamp;
}
```

**FlightBookings Collection:**

```typescript
{
  id: string;
  studentId: string; // Reference to students collection
  studentName: string; // Denormalized for quick display
  scheduledDate: string; // ISO 8601: "2025-11-15"
  scheduledTime: string; // "09:00 AM"
  departureLocation: {
    name: string; // e.g., "Palo Alto Airport (PAO)"
    lat: number;  // 37.4611
    lon: number;  // -122.1150
  };
  status: "scheduled" | "cancelled" | "completed";
  weatherStatus?: "safe" | "caution" | "unsafe"; // Set by weather check
  lastWeatherCheck?: Timestamp;
  createdAt: Timestamp;
}
```

### Weather Minimums (Deterministic Logic)

| Training Level       | Visibility | Wind Speed | Ceiling            | Special Conditions         |
| -------------------- | ---------- | ---------- | ------------------ | -------------------------- |
| **Student Pilot**    | > 5 mi     | < 10 kt    | Clear to scattered | No precipitation, no fog   |
| **Private Pilot**    | > 3 mi     | < 20 kt    | > 1000 ft          | No thunderstorms           |
| **Instrument Rated** | > 1 mi     | Flexible   | IMC OK             | No thunderstorms, no icing |

### WeatherAPI.com Field Mapping

Based on `current.json` endpoint, these fields are used for safety checks:

- **`vis_miles`** → Visibility (CRITICAL for VFR)
- **`wind_mph`** → Convert to knots (multiply by 0.868976)
- **`gust_mph`** → Wind gusts in knots
- **`cloud`** → Cloud cover percentage (0-100) - used to estimate ceiling
- **`condition.text`** → Parse for thunderstorms, rain, fog
- **`temp_c`** → Check for icing conditions (< 0°C with clouds)

### Mock Data Requirements

Create `mockData.ts` in `/src/data/` with:

- **5-10 students** with diverse training levels
- **10-15 flight bookings** with varied dates and locations
- **Real California airport coordinates** (PAO, SQL, RHV, SJC, etc.)
- **No pre-generated AI reschedules** (AI generates these dynamically)

---

## 8. AI Behavior & Role

**IMPORTANT:** AI does **NOT** determine weather safety. The deterministic logic in `weatherLogic.ts` makes all safety decisions.

### AI's Role (OpenAI API)

AI **only** generates:

1. **Human-readable explanations** of why a flight is unsafe
2. **3 reschedule suggestions** with dates/times and reasoning
3. **Friendly notification messages** for students

### Example AI Prompt Structure

```
You are a flight scheduling assistant for ClearSkies.

Flight Details:
- Student: Sarah Mitchell (Student Pilot)
- Original Date: November 15, 2025 at 09:00 AM
- Location: Palo Alto Airport (PAO)

Weather Issue (determined by safety logic):
- Visibility: 2 miles (minimum required: 5 miles)
- Wind: 15 knots (maximum allowed: 10 knots)

Task:
1. Write a brief, professional explanation (2-3 sentences) of why the flight was unsafe for a Student Pilot.
2. Suggest 3 alternative dates/times within the next 7 days when weather is typically better.
3. For each suggestion, explain why that time is recommended.

Respond in JSON format:
{
  "explanation": "string",
  "suggestions": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:MM AM/PM",
      "reason": "string"
    }
  ]
}
```

### What AI Does NOT Do

- ❌ Check weather data
- ❌ Determine if flight is safe/unsafe
- ❌ Access WeatherAPI directly
- ❌ Make booking decisions

All safety logic is **deterministic and transparent**.

---

## 9. Dashboard Features & Interaction Flows

| Section                    | Functionality                                                                 |
| -------------------------- | ----------------------------------------------------------------------------- |
| **Upcoming Flights Panel** | Displays all active and upcoming bookings with color-coded safety indicators. |
| **Alerts Center**          | Lists active weather conflicts with AI recommendations.                       |
| **Reschedule Column**      | Displays AI-generated times and allows confirmation.                          |
| **Notifications**          | Toasts or modals confirming successful updates.                               |
| **Settings Page**          | Minimal preferences for user details or notification toggles.                 |

### Booking Status State Machine

```
┌──────────────┐
│  scheduled   │ ← Initial state when booking is created
└──────┬───────┘
       │
       ├─────→ Weather check runs hourly
       │
       ├─────→ Set weatherStatus: "safe" | "caution" | "unsafe"
       │
       ├─────→ [IF unsafe] → Trigger AI reschedule generation
       │                  → Send notifications
       │
       ├─────→ Student confirms reschedule
       │        ├─ Update scheduledDate/scheduledTime
       │        ├─ Reset weatherStatus → undefined
       │        └─ Status remains: "scheduled"
       │
       ├─────→ Student cancels booking
       │        └─ Status → "cancelled"
       │
       └─────→ Flight date passes
                └─ Status → "completed"
```

### Primary User Flow (Student)

**Scenario: Weather Alert & Rescheduling**

1. Student logs in → Dashboard loads
2. Weather check runs (backend, hourly)
3. Flight flagged as **unsafe** → `weatherStatus: "unsafe"` set in Firestore
4. Real-time Firestore listener updates dashboard instantly
5. Alert card appears in **Alerts Center** with:
   - Flight details
   - Weather issue (e.g., "Visibility: 2 mi, Wind: 15 kt")
   - AI explanation text
6. Student clicks **"View Options"** → AI-generated reschedule suggestions load
7. Student selects one of 3 options → Clicks **"Confirm Reschedule"**
8. Firestore updates booking (new date/time)
9. Success toast appears: "✅ Flight Rescheduled"
10. Email confirmation sent
11. Alert card disappears from dashboard

### Concurrent Edit Behavior

**Problem:** Two users (student + admin/instructor) edit the same booking simultaneously.

**Solution: Firestore Transaction + Optimistic UI**

- Use Firestore transactions for all booking updates
- If transaction fails due to concurrent write → retry once automatically
- If retry fails → show error toast: "Booking was modified by another user. Please refresh."
- Refresh button reloads latest data from Firestore
- **No data loss** — last write wins with transaction protection

**Implementation:**

```typescript
// Use Firestore runTransaction for reschedule confirmation
await runTransaction(db, async (transaction) => {
  const bookingRef = doc(db, "bookings", bookingId);
  const bookingSnap = await transaction.get(bookingRef);

  if (!bookingSnap.exists()) {
    throw new Error("Booking no longer exists");
  }

  transaction.update(bookingRef, {
    scheduledDate: newDate,
    scheduledTime: newTime,
    weatherStatus: null,
    lastModified: serverTimestamp(),
  });
});
```

---

## 10. Error Handling & Retry Logic

All major processes (API calls, AI calls, database updates) must implement comprehensive error handling.

### Error Categories & Responses

| Error Type                    | Cause                                | User-Facing Message                                                     | Retry Strategy                                        |
| ----------------------------- | ------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| **Weather API Failure**       | Network error, API down, rate limit  | "⚠️ Weather data unavailable — retrying shortly."                       | Auto-retry 3x with exponential backoff (5s, 15s, 45s) |
| **OpenAI API Failure**        | Network error, API down, token limit | "⚠️ Unable to generate reschedule options. Please try again."           | Manual retry button, log to Firestore                 |
| **Firestore Write Failure**   | Permission denied, network error     | "⚠️ Failed to save changes. Please refresh and try again."              | Auto-retry 2x, then show manual retry                 |
| **Concurrent Edit Conflict**  | Two users edit same booking          | "⚠️ Booking was modified by another user. Please refresh."              | Show refresh button, reload data                      |
| **Authentication Error**      | Token expired, session invalid       | Redirect to login with message: "Session expired. Please log in again." | Clear session, redirect to `/login`                   |
| **Notification Send Failure** | Email service down, invalid email    | Log error to Firestore, do NOT block booking update                     | Background retry queue (3 attempts over 24h)          |

### Error State UI Components

**Toast Notifications:**

- Position: Top-right (desktop), top-center (mobile)
- Duration: 7-10 seconds for errors (user can dismiss)
- Include retry button when applicable
- Use Lucide `AlertTriangle` icon for warnings, `XCircle` for errors

**Empty States:**

- **No Flights:** "✈️ No flights scheduled. Book your first flight!"
- **No Alerts:** "☀️ All clear — no weather risks detected."
- **No Reschedule Options:** "🤖 Generating reschedule options..."

**Loading States:**

- Dashboard loading: `Loader2` icon with spin animation + "Loading your flights..."
- Weather check: Subtle pulse animation on flight cards
- AI generation: "🤖 AI is analyzing weather patterns..."

### Backend Error Logging

All errors must be logged to Firestore in `errorLogs` collection:

```typescript
{
  id: string;
  type: "weather_api" | "openai_api" | "firestore" | "notification";
  message: string;
  bookingId?: string;
  studentId?: string;
  timestamp: Timestamp;
  retryCount: number;
  resolved: boolean;
}
```

### Firebase Functions Error Handling Template

```typescript
export const weatherCheck = functions.pubsub
  .schedule("every 1 hours")
  .onRun(async (context) => {
    try {
      // Main logic here
    } catch (error) {
      console.error("Weather check failed:", error);

      // Log to Firestore
      await db.collection("errorLogs").add({
        type: "weather_api",
        message: error.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        retryCount: 0,
        resolved: false,
      });

      // Don't throw - allow scheduler to continue
      return null;
    }
  });
```

---

## 11. Settings Page Specification

The Settings page (`/settings`) provides students with control over their profile and notification preferences.

### Settings Options

#### Profile Section

- **Name:** Display only (non-editable, from Firebase Auth)
- **Email:** Display only (from Firebase Auth)
- **Phone:** Editable text input, format validation: `(XXX) XXX-XXXX`
- **Training Level:** Dropdown selection
  - Options: "Student Pilot", "Private Pilot", "Instrument Rated"
  - Updates Firestore `students` collection

#### Notification Preferences

- **Email Notifications:**
  - Toggle: Weather Alerts (default: ON)
  - Toggle: Reschedule Confirmations (default: ON)
  - Toggle: Weather Improvements (default: ON)
- **In-App Notifications:**
  - Toggle: Toast Notifications (default: ON)
  - Note: "You'll still see critical alerts even if disabled"

#### Display Preferences

- **Theme:** Toggle between Light/Dark mode
  - Stored in `localStorage`
  - Uses Tailwind dark mode classes

### Settings UI Layout

```
┌─────────────────────────────────────┐
│ ⚙️ Settings                         │
├─────────────────────────────────────┤
│                                     │
│ Profile                             │
│ ├─ Name: Sarah Mitchell             │
│ ├─ Email: sarah@example.com         │
│ ├─ Phone: [editable input]          │
│ └─ Training Level: [dropdown]       │
│                                     │
│ Notifications                       │
│ ├─ 📧 Email Alerts [toggle]         │
│ ├─ 📧 Reschedule Emails [toggle]    │
│ └─ 💬 In-App Toasts [toggle]        │
│                                     │
│ Display                             │
│ └─ 🌙 Dark Mode [toggle]            │
│                                     │
│ [Save Changes] [Cancel]             │
│                                     │
└─────────────────────────────────────┘
```

### Settings Data Structure (Firestore)

Store in `students` collection under each student document:

```typescript
{
  // ... existing student fields
  settings: {
    notifications: {
      emailWeatherAlerts: boolean;
      emailReschedule: boolean;
      emailWeatherImproved: boolean;
      inAppToasts: boolean;
    }
    theme: "light" | "dark";
    updatedAt: Timestamp;
  }
}
```

---

## 12. Firebase Configuration Checklist

### Initial Setup

- [ ] Create Firebase project: `clearskies-app`
- [ ] Enable Firestore Database (production mode)
- [ ] Enable Firebase Authentication (Email/Password)
- [ ] Enable Cloud Functions for Firebase
- [ ] Enable Cloud Scheduler (requires Firebase Blaze plan)
- [ ] Install Firebase CLI: `npm install -g firebase-tools`
- [ ] Login: `firebase login`
- [ ] Initialize project: `firebase init`

### Firestore Collections Setup

- [ ] Create collection: `students`
  - [ ] Add composite index: `trainingLevel ASC, createdAt DESC`
- [ ] Create collection: `bookings`
  - [ ] Add composite index: `studentId ASC, scheduledDate ASC`
  - [ ] Add composite index: `weatherStatus ASC, scheduledDate ASC`
- [ ] Create collection: `errorLogs`
  - [ ] Add index: `type ASC, timestamp DESC`
  - [ ] Add index: `resolved ASC, timestamp DESC`

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Students can read/write their own data
    match /students/{studentId} {
      allow read, write: if request.auth != null && request.auth.uid == studentId;
    }

    // Students can read/write their own bookings
    match /bookings/{bookingId} {
      allow read: if request.auth != null &&
                     resource.data.studentId == request.auth.uid;
      allow write: if request.auth != null &&
                      request.resource.data.studentId == request.auth.uid;
    }

    // Error logs: write from Cloud Functions only
    match /errorLogs/{logId} {
      allow read: if false; // No direct reads
      allow write: if false; // Functions use admin SDK
    }
  }
}
```

### Cloud Functions Configuration

- [ ] Navigate to `/functions` directory
- [ ] Install dependencies: `npm install`
- [ ] Set environment variables:
  ```bash
  firebase functions:config:set \
    weather.api_key="YOUR_WEATHERAPI_KEY" \
    openai.api_key="YOUR_OPENAI_KEY"
  ```
- [ ] Deploy functions: `firebase deploy --only functions`

### Cloud Scheduler Setup

- [ ] Create scheduled function: `checkWeatherStatus`
- [ ] Schedule: Every 1 hour (`0 * * * *`)
- [ ] Region: `us-central1`
- [ ] Test trigger: `firebase functions:shell` → `checkWeatherStatus()`

### Environment Variables (Frontend)

Create `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### Vercel Deployment Setup

- [ ] Connect GitHub repository to Vercel
- [ ] Add environment variables in Vercel dashboard (same as `.env.local`)
- [ ] Set build command: `npm run build`
- [ ] Set output directory: `.next`
- [ ] Enable automatic deployments from `main` branch

### Post-Deployment Verification

- [ ] Test Firebase Auth: Sign up new user
- [ ] Test Firestore: Create booking
- [ ] Test Cloud Function: Trigger manual weather check
- [ ] Test Cloud Scheduler: Wait 1 hour, verify automatic execution
- [ ] Test Vercel deployment: Visit production URL
- [ ] Test real-time updates: Open dashboard in 2 tabs, update booking in one

---

## 13. Environment Variables

### Required Environment Variables

Create `.env.local` in the project root with these variables:

```bash
# ====================================
# Firebase Configuration (Frontend)
# ====================================
# Get these from: Firebase Console → Project Settings → General → Your apps → SDK setup and configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# ====================================
# API Keys (Backend - Firebase Functions)
# ====================================
# WeatherAPI: https://www.weatherapi.com/ (Free tier available)
WEATHER_API_KEY=

# OpenAI: https://platform.openai.com/api-keys
OPENAI_API_KEY=
```

### Firebase Functions Environment Configuration

For Firebase Functions, set environment variables using:

```bash
firebase functions:config:set \
  weather.api_key="YOUR_WEATHERAPI_KEY" \
  openai.api_key="YOUR_OPENAI_KEY"
```

Access in functions via:

```typescript
const weatherApiKey = functions.config().weather.api_key;
const openaiApiKey = functions.config().openai.api_key;
```

### Vercel Environment Variables

Add the same `NEXT_PUBLIC_*` variables to your Vercel project:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable with the same key-value pairs as `.env.local`
3. Select all environments (Production, Preview, Development)

---

## 14. Testing Checklist

All tests below **must pass** for the project to be approved:

- ✅ **Weather API Integration:** Returns valid JSON and correct weather data.
- ✅ **Safety Logic:** Flags unsafe flights correctly based on training level.
- ✅ **AI Output:** Generates 3 valid reschedule options.
- ✅ **Notification:** Sends email and in-app alerts successfully.
- ✅ **Dashboard:** Displays accurate flight and weather statuses.
- ✅ **Database:** Logs all reschedules with timestamps.
- ✅ **Scheduler:** Triggers hourly weather monitoring without failure.
- ✅ **AI Log:** Contains all PR task entries and prompt summaries.

---

## 15. Deliverables & Metrics

### Required Deliverables

- ✅ **GitHub Repository** with clean, modular TypeScript code.
- ✅ **README** with setup and usage instructions.
- ✅ **.env.template** file with all required environment variables.
- ✅ **ai-log.md** documenting the AI-driven build process.

### Key Metrics to Track

- Total **Bookings Created**
- Total **Weather Conflicts Detected**
- **Successful Reschedules** (AI-suggested + confirmed)
- **Average Rescheduling Time** (From detection to confirmation)

---

## 13. Environment Variables

Example `.env.template` contents:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
OPENAI_API_KEY=
WEATHER_API_KEY=
```

Ensure these are mirrored in both `.env.local` (for local dev) and Vercel project settings.

---

## 16. Accessibility & Compliance

- WCAG AA color contrast compliance.
- Descriptive `aria-labels` for all icons.
- Keyboard navigation across dashboard.
- Deterministic safety logic (no opaque "AI magic").

---

## 17. Deployment Plan

1. **Frontend:** Deploy via Vercel connected to GitHub.
2. **Backend:** Deploy Firebase Functions using Firebase CLI.
3. **Scheduler:** Configure hourly job via Firebase Cloud Scheduler.
4. **Environment:** Sync `.env.local` and production configs.
5. **Testing:** Run pre-deployment tests for all success criteria.
6. **AI Log:** Automatically generated and finalized upon completion of all PRs.

---

## 18. Completion Definition

ClearSkies will be considered _production-ready_ when:

- All success criteria (Section 3) are met.
- All testing checklist items (Section 11) pass.
- Frontend + backend are deployed and functional.
- Database and notifications work in real-time.
- AI reasoning and rescheduling outputs are validated and user-friendly.
- AI Log accurately documents the full AI-assisted build process.

---

**Author:** Yahav Corcos  
**Version:** 1.1  
**Date:** November 2025  
**Project:** ClearSkies — AI Flight Rescheduler
