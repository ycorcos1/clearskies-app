# ClearSkies — Full Task List

This document defines each concrete task (PR) Cursor must complete to build the **ClearSkies** app from start to finish.  
Each task includes clear objectives, implementation details, and expected outcomes.  
Cursor must also update the `ai-log.md` after completing each PR to summarize its process and decisions.

---

## PR #1 — Project Initialization

**Objective:** Set up the ClearSkies project structure, dependencies, and environments.

**Implementation Steps:**

1. Initialize a new **Next.js (TypeScript)** project using `create-next-app`.
2. Configure **TailwindCSS** for UI styling.
3. Add required libraries:
   - `firebase` (Firebase SDK)
   - `lucide-react` (Icons)
   - `react-toastify` (Notifications)
4. Create essential folders:
   ```
   /src
     /components
     /pages
       /api
     /styles
     /lib
     /utils
     /data
     /context
   /public
     /images
   /docs
   /functions (Firebase Functions)
   ```
5. Add `.gitignore`, `README.md`, and `.env.local` template (documented in PRD Section 13).
6. Configure **Vercel** for automatic deployment (connect GitHub repo).
7. Initialize Git repository and make initial commit.
8. Update `ai-log.md` with setup summary.

**Output:** Working Next.js boilerplate with configured dependencies and environment templates.

---

## PR #2 — Firebase Configuration

**Objective:** Connect Firebase for authentication, database, and functions.

**Implementation Steps:**

1. Initialize Firebase project and install Firebase CLI.
2. Add `firebaseConfig.ts` under `/src/lib/` with environment-based config.
3. Enable Firestore, Authentication, and Functions.
4. Create `/functions` folder with `index.ts` entry file.
5. Connect Firestore emulator locally for testing.
6. Add sample collection: `students` and `bookings`.
7. Deploy initial Firebase setup using `firebase deploy`.
8. Log results and deployment steps in `ai-log.md`.

**Output:** Firebase connected, deployed, and locally testable.

---

## PR #3 — Firestore Schema & Mock Data

**Objective:** Implement Firestore collections and seed with realistic mock data.

**Implementation Steps:**

1. Define schema for:
   - **Students** → `id`, `name`, `email`, `phone`, `trainingLevel`, `createdAt`
   - **FlightBookings** → `id`, `studentId`, `studentName`, `scheduledDate`, `scheduledTime`, `departureLocation`, `status`, `weatherStatus`, `lastWeatherCheck`, `createdAt`
   - **ErrorLogs** → `id`, `type`, `message`, `bookingId`, `studentId`, `timestamp`, `retryCount`, `resolved`
2. Use existing `mockData.ts` in `/src/data/` with:
   - 8 students with diverse training levels
   - 15 flight bookings with varied dates, locations, and statuses
   - Real California airport coordinates
3. Create Firestore seed script in `/src/utils/seedFirestore.ts` to populate mock data.
4. Test seeding locally using Firebase emulator.
5. Apply Firestore security rules (from PRD Section 12).
6. Log completion in `ai-log.md`.

**Output:** Firestore seeded with realistic mock data, security rules applied.

---

## PR #4 — Weather API Integration

**Objective:** Integrate **WeatherAPI.com** for real-time weather data retrieval.

**Implementation Steps:**

1. Create `/src/lib/weatherAPI.ts` for reusable API calls.
2. Implement function:
   ```ts
   export const getWeatherData = async (lat: number, lon: number) => {
     // Calls WeatherAPI current.json endpoint
     // Returns structured weather data
   };
   ```
3. Map WeatherAPI fields (from PRD Section 7):
   - `vis_miles` → Visibility
   - `wind_mph` → Wind speed (convert to knots)
   - `gust_mph` → Wind gusts
   - `cloud` → Cloud cover percentage
   - `condition.text` → Weather conditions (parse for hazards)
   - `temp_c` → Temperature (check for icing)
4. Include error handling with retry logic (exponential backoff).
5. Write test to verify valid response for sample coordinates (Palo Alto Airport: 37.4611, -122.115).
6. Document API key setup and usage in `ai-log.md`.

**Output:** Working weather data integration with proper error handling.

---

## PR #5 — Weather Safety Logic

**Objective:** Implement deterministic logic that flags unsafe flight conditions.

**Implementation Steps:**

1. Create `/src/utils/weatherLogic.ts`.
2. Implement logic using thresholds from PRD Section 7:
   - **Student Pilot:** visibility > 5 mi, wind < 10 kt, clear/scattered clouds, no precipitation/fog
   - **Private Pilot:** visibility > 3 mi, wind < 20 kt, ceiling > 1000 ft, no thunderstorms
   - **Instrument Rated:** visibility > 1 mi, wind flexible, IMC OK, no thunderstorms/icing
3. Return safety status: `"safe"`, `"caution"`, or `"unsafe"`.
4. Include detailed violation messages (e.g., "Visibility: 2 mi (minimum: 5 mi for Student Pilots)").
5. Write comprehensive test cases for all training levels and edge cases.
6. Test with mock data to simulate various weather scenarios.
7. Log test results and validation in `ai-log.md`.

**Output:** Deterministic safety logic tested and validated, outputs accurate status per training level.

---

## PR #6 — Firebase Cloud Scheduler & Weather Monitor

**Objective:** Automate hourly weather checks for all upcoming bookings.

**Implementation Steps:**

1. Create Firebase Function `checkWeatherStatus()`.
2. Use Cloud Scheduler to run this function every hour.
3. For each booking, call `getWeatherData()` and evaluate safety via `weatherLogic.ts`.
4. Update Firestore with result (`safe`, `caution`, `unsafe`).
5. Trigger notification events for unsafe flights.
6. Include Firestore logging for last checked timestamp.
7. Update `ai-log.md` summarizing scheduler implementation.

**Output:** Automated weather monitoring system running hourly.

---

## PR #7 — AI-Powered Rescheduler (OpenAI Integration)

**Objective:** Use OpenAI API to generate human-readable messages and reschedule suggestions.

**Implementation Steps:**

1. Create `/src/lib/aiRescheduler.ts`.
2. Implement API call to OpenAI with structured prompt (from PRD Section 8):
   - Flight details (student name, training level, date, location)
   - Weather violations (from safety logic output)
   - Request 3 alternative date/time suggestions with reasoning
3. Expected AI output format:
   ```json
   {
     "explanation": "Brief explanation of why flight is unsafe",
     "suggestions": [
       {
         "date": "YYYY-MM-DD",
         "time": "HH:MM AM/PM",
         "reason": "Why this time is recommended"
       }
     ]
   }
   ```
4. Store AI responses in Firestore under `/aiReschedules` subcollection per booking.
5. Implement error handling for OpenAI API failures (manual retry, log to errorLogs).
6. Test with various weather scenarios and training levels.
7. Log AI prompts, responses, and performance in `ai-log.md`.

**Output:** OpenAI integration returning structured reschedule suggestions with explanations.

---

## PR #8 — Notification System

**Objective:** Notify students when flights are unsafe or rescheduled.

**Implementation Steps:**

1. Implement email notifications via Firebase Functions (or SendGrid/Mailgun).
2. Use email templates from Design Spec Section 10:
   - Weather Alert Email
   - Reschedule Confirmation Email
   - Weather Improved Email
3. Implement in-app toast notifications using `react-toastify`:
   - Weather Alert Toast
   - Reschedule Confirmation Toast
   - Error Toast
   - Booking Cancelled Toast
4. Update Firestore to log notification events with timestamps.
5. Link reschedule confirmation to Firestore booking updates (use transactions).
6. Implement retry logic for failed email notifications (background queue, 3 attempts over 24h).
7. Respect user notification preferences from Settings (emailWeatherAlerts, inAppToasts, etc.).
8. Document notification flow and error handling in `ai-log.md`.

**Output:** Working notification system with email and in-app toasts, respects user preferences.

---

## PR #9 — Dashboard Implementation

**Objective:** Create ClearSkies dashboard with all functional panels and interactions.

**Implementation Steps:**

1. Implement `/pages/dashboard.tsx`.
2. Layout: Responsive 3-column structure (from Design Spec Section 4):
   - **Mobile:** Single column, stacked panels
   - **Tablet:** Two columns (flights + alerts), reschedule below
   - **Desktop:** Three columns side-by-side
3. Dashboard panels:
   - **Left:** Upcoming Flights with color-coded safety indicators
   - **Center:** Weather Alerts with AI explanations
   - **Right:** AI Reschedule Suggestions with one-click confirm
4. Apply ClearSkies design spec:
   - Color palette (Section 2)
   - Typography (Inter font)
   - Lucide React icons (Section 6)
   - Notification templates (Section 10)
5. Fetch data from Firestore in real-time using snapshot listeners.
6. Implement booking status state machine (from PRD Section 9).
7. Add confirmation buttons for reschedule acceptance (use Firestore transactions).
8. Implement empty states, loading states, and error states (from PRD Section 10).
9. Add footer: "ClearSkies © 2025".
10. Test responsive breakpoints and micro-interactions.
11. Log UI deployment summary in `ai-log.md`.

**Output:** Fully functional, responsive dashboard matching design specifications.

---

## PR #10 — Authentication & Settings

**Objective:** Add Firebase Auth and comprehensive settings page.

**Implementation Steps:**

1. Implement Firebase email/password signup and login.
2. Create `/pages/login.tsx` with aviation background gradient.
3. Protect `/dashboard` and `/settings` routes for authenticated users only.
4. Implement `/pages/settings.tsx` with options from PRD Section 11:
   - **Profile:** Name, email (read-only), phone (editable), training level (dropdown)
   - **Notifications:** Toggles for email/in-app notifications
   - **Display:** Light/Dark mode toggle
5. Store settings in Firestore `students` collection under `settings` field.
6. Add logout button in top navbar with user avatar.
7. Implement session persistence and error handling (expired token → redirect to login).
8. Test authentication flow: signup → login → dashboard access → logout.
9. Record setup summary in `ai-log.md`.

**Output:** Authenticated access with comprehensive settings management.

---

## PR #11 — Testing Suite

**Objective:** Implement testing for backend logic and core UI workflows.

**Implementation Steps:**

1. Add Jest or Vitest for unit testing.
2. Test files:
   - `weatherLogic.test.ts`
   - `aiRescheduler.test.ts`
   - `notification.test.ts`
3. Use Firebase Emulator for integration tests.
4. Validate all success criteria from PRD.
5. Log test results in `ai-log.md`.

**Output:** All tests passing and validated.

---

## PR #12 — Deployment & Final QA

**Objective:** Deploy ClearSkies to production and validate final deliverables.

**Implementation Steps:**

1. Deploy frontend to Vercel and backend functions to Firebase.
2. Confirm hourly Cloud Scheduler is active.
3. Verify all success criteria, test checklist, and metrics tracking.
4. Export `.env.template` and README documentation.
5. Finalize and close out AI Log with full build summary.

**Output:** Production-ready ClearSkies app, passing all tests and criteria.

---

# ✅ Completion Definition

The project is complete when:

- All 12 PR tasks are implemented and documented.
- All success criteria and tests in PRD are satisfied.
- `ai-log.md` is finalized and complete.
- The deployed app runs reliably with hourly updates and live data.

---

**Author:** Yahav Corcos  
**Version:** 1.0  
**Date:** November 2025  
**Project:** ClearSkies — AI Flight Rescheduler
