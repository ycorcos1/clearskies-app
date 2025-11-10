# ClearSkies Refactor — Implementation Task List

## Overview

This task list covers the complete refactor from student-only dashboard to role-based system with instructor oversight and training level management.

---

## Phase 1: Database Schema & Types Updates

### Task 1.1: Update TypeScript Types

- [ ] Add `role` field to `Student` interface: `"student" | "instructor"`
- [ ] Add `assignedInstructor` field to `Student` interface (optional string)
- [ ] Add `assignedInstructor` field to `FlightBooking` interface (optional string)
- [ ] Create `NotificationEvent` interface
- [ ] Update `TrainingLevel` type usage across codebase

**Files to modify:**

- `src/data/types.ts`
- `functions/src/types.ts`

---

### Task 1.2: Update Firestore Security Rules

- [ ] Add `getUserDoc()` helper function
- [ ] Add `isInstructor()` helper function
- [ ] Add `isStudent()` helper function
- [ ] Update `students` collection rules (read for all authenticated users)
- [ ] Update `bookings` collection rules for instructor read access
- [ ] Add rules for `notificationEvents` collection
- [ ] Keep `notificationQueue` rules (Cloud Functions only)

**Files to modify:**

- `firestore.rules`

**Deploy:**

```bash
firebase deploy --only firestore:rules
```

---

### Task 1.3: Update Firestore Indexes

- [ ] Add composite index: `assignedInstructor ASC + status ASC + scheduledDate ASC + scheduledTime ASC`
- [ ] Add index for notifications: `userId ASC + read ASC + createdAt DESC`

**Files to modify:**

- `firestore.indexes.json`

**Deploy:**

```bash
firebase deploy --only firestore:indexes
```

---

## Phase 2: Authentication & Role Selection

### Task 2.1: Update Signup Page

- [ ] Add role selector radio buttons: `○ Student  ○ Instructor`
- [ ] Update state management for role selection
- [ ] Modify signup handler to include `role` in user document
- [ ] For students with `trainingLevel: "student"`, auto-assign to first instructor
- [ ] Query instructors collection and set `assignedInstructor` field

**Files to modify:**

- `src/app/login/page.tsx`

**New logic:**

```typescript
// On signup for students:
1. Create user document with role
2. If role === "student":
   - Set trainingLevel = "student"
   - Query for instructors (role === "instructor")
   - Set assignedInstructor = first instructor.id
```

---

### Task 2.2: Update Login Flow

- [ ] Remove role selector from login (retrieve from database)
- [ ] Ensure role is loaded into auth context/state
- [ ] Update `useAuthUser` hook if needed to include role

**Files to check:**

- `src/app/login/page.tsx`
- `src/hooks/useAuthUser.ts` (if role needs to be exposed)

---

## Phase 3: Dashboard Query Updates

### Task 3.1: Update useBookings Hook

- [ ] Accept `role` parameter
- [ ] For students: keep existing query (`where("studentId", "==", userId)`)
- [ ] For instructors: query `where("assignedInstructor", "==", instructorId)`
- [ ] Update both `buildUpcomingQuery` and `buildAlertsQuery`

**Files to modify:**

- `src/hooks/useBookings.ts`

**New queries:**

```typescript
const buildUpcomingQuery = (userId: string, role: string): Query => {
  if (role === "instructor") {
    return query(
      collectionRef,
      where("assignedInstructor", "==", userId),
      where("status", "==", "scheduled"),
      orderBy("scheduledDate"),
      orderBy("scheduledTime")
    );
  }
  // Student query (existing)
  return query(
    collectionRef,
    where("studentId", "==", userId),
    where("status", "==", "scheduled"),
    orderBy("scheduledDate"),
    orderBy("scheduledTime")
  );
};
```

---

### Task 3.2: Update Dashboard Page

- [ ] Fetch user role from Firestore
- [ ] Pass role to `useDashboardBookings` hook
- [ ] Update UI to show role in header: "Welcome, [Name] ([Role])"
- [ ] Conditionally show "Load Demo Data" button (students only)

**Files to modify:**

- `src/app/dashboard/page.tsx`

---

## Phase 4: Notifications System

### Task 4.1: Create Notifications Dropdown Component

- [ ] Create `NotificationsDropdown.tsx` component
- [ ] Add bell icon with badge count
- [ ] Real-time listener on `notificationEvents` collection
- [ ] Query: `where("userId", "==", user.uid).where("read", "==", false).limit(10)`
- [ ] Display list of notifications with types (weather_alert, reschedule, cancellation)
- [ ] Add "Mark as read" functionality
- [ ] Add "Mark all as read" button
- [ ] Click notification → navigate to related flight (scroll to or select)

**New file:**

- `src/components/dashboard/NotificationsDropdown.tsx`

**Files to modify:**

- `src/components/dashboard/Header.tsx` (add notifications dropdown)

---

### Task 4.2: Create useNotifications Hook

- [ ] Real-time Firestore listener for `notificationEvents`
- [ ] Filter by `userId` and `read: false`
- [ ] Return notifications array and count
- [ ] Provide `markAsRead(id)` function
- [ ] Provide `markAllAsRead()` function

**New file:**

- `src/hooks/useNotifications.ts`

---

## Phase 5: Mock Data Generation

### Task 5.1: Update Demo Data Seed Function

- [ ] Modify `seedUserDemoData` to accept `instructorId` parameter
- [ ] Add `assignedInstructor` field to all generated bookings
- [ ] Ensure `trainingLevel: "student"` for all bookings
- [ ] Generate `notificationEvents` for demo purposes
- [ ] Delete existing bookings before generating new ones

**Files to modify:**

- `src/utils/seedUserDemoData.ts`

---

### Task 5.2: Create "Load Demo Data" Modal

- [ ] Create modal component with instructor dropdown
- [ ] Query Firestore for users with `role: "instructor"`
- [ ] Display instructor names in dropdown
- [ ] On submit: call `seedUserDemoData` with selected instructor ID
- [ ] Show loading state during generation
- [ ] Show success toast after completion

**New file:**

- `src/components/dashboard/LoadDemoDataModal.tsx`

**Files to modify:**

- `src/app/dashboard/page.tsx` (add modal trigger and state)

---

## Phase 6: Settings Page Updates

### Task 6.1: Add Training Level Selector (Students Only)

- [ ] Add training level dropdown: Student Pilot / Private Pilot / Instrument Rated
- [ ] Show current weather minimums based on selected level
- [ ] Add warning message about instructor oversight changes
- [ ] Conditionally render (students only, not instructors)

**Files to modify:**

- `src/app/settings/page.tsx`

---

### Task 6.2: Create updateTrainingLevel Cloud Function

- [ ] Create new callable function in `functions/src/index.ts`
- [ ] Authenticate user (must be student role)
- [ ] Update student document: `trainingLevel`, `assignedInstructor`
- [ ] Query all scheduled bookings for student
- [ ] Batch update bookings: `trainingLevel`, `assignedInstructor`, clear `weatherStatus`
- [ ] Delete AI reschedule suggestions (query subcollections)
- [ ] Re-evaluate weather for all scheduled flights
- [ ] Return success response

**New function:**

- `functions/src/index.ts` → `export const updateTrainingLevel`

**Implementation:**

```typescript
export const updateTrainingLevel = functions.https.onCall(
  async (data, context) => {
    const { newTrainingLevel } = data;
    const userId = context.auth?.uid;

    // 1. Validate auth and role
    // 2. Determine assignedInstructor based on newTrainingLevel
    // 3. Update student document
    // 4. Query and update all scheduled bookings
    // 5. Delete AI reschedule suggestions
    // 6. Re-evaluate weather for each booking
    // 7. Return success
  }
);
```

---

### Task 6.3: Create Client-Side Training Level Update

- [ ] Create `updateTrainingLevel.ts` utility in `src/lib/`
- [ ] Call Firebase callable function
- [ ] Handle loading state
- [ ] Show success/error toasts
- [ ] Trigger dashboard refresh (Firestore listeners will handle this)

**New file:**

- `src/lib/updateTrainingLevel.ts`

**Files to modify:**

- `src/app/settings/page.tsx` (integrate update function)

---

## Phase 7: Role-Based UI Updates

### Task 7.1: Update Flight Card Actions

- [ ] Add `role` prop to `UpcomingFlights` component
- [ ] Students: Show "Reschedule" and "Cancel" buttons
- [ ] Instructors: Show "Cancel" button only (no reschedule)
- [ ] Update `WeatherAlerts` component similarly

**Files to modify:**

- `src/components/dashboard/UpcomingFlights.tsx`
- `src/components/dashboard/WeatherAlerts.tsx`

---

### Task 7.2: Update Reschedule Options Component

- [ ] Add `role` prop to `RescheduleOptions`
- [ ] Students: Show "Confirm reschedule" buttons
- [ ] Instructors: Hide "Confirm reschedule" buttons (view only)
- [ ] Display "Read-only view" message for instructors

**Files to modify:**

- `src/components/dashboard/RescheduleOptions.tsx`

---

### Task 7.3: Update Cancellation Flow

- [ ] Remove reason field from cancellation modal (per PRD)
- [ ] Keep simple confirmation: "Are you sure?"
- [ ] Update `cancelledBy` field to store user UID
- [ ] Enqueue cancellation notification

**Files to modify:**

- `src/app/dashboard/page.tsx` (or create `CancellationModal.tsx`)

---

### Task 7.4: Add Metrics Dashboard (Instructor View)

- [ ] Create `MetricsPanel.tsx` component
- [ ] Query Firestore for counts:
  - Total bookings
  - Weather conflicts detected
  - Successful reschedules
  - Average rescheduling time
- [ ] Show training level breakdown
- [ ] Conditionally render (instructors only)

**New file:**

- `src/components/dashboard/MetricsPanel.tsx`

**Files to modify:**

- `src/app/dashboard/page.tsx` (add metrics panel for instructors)

---

## Phase 8: Cloud Functions Updates

### Task 8.1: Update Notification Queue Logic

- [ ] Modify `enqueueNotification` to handle instructor notifications
- [ ] When enqueueing, check if student has `assignedInstructor`
- [ ] If yes, create notification for both student AND instructor
- [ ] Update notification templates to handle instructor context

**Files to modify:**

- `functions/src/logic/notificationQueue.ts`
- `functions/src/logic/notifications.ts`

---

### Task 8.2: Update Weather Check Functions

- [ ] Ensure `checkScheduledFlights` works with new schema
- [ ] Ensure `manualWeatherCheck` works with new schema
- [ ] No major changes needed (uses `trainingLevel` from booking)

**Files to verify:**

- `functions/src/index.ts` (weather check functions)

---

### Task 8.3: Deploy Cloud Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

---

## Phase 9: Testing & Validation

### Task 9.1: Create Test Accounts

- [ ] Create instructor account (email: [your-instructor-email])
- [ ] Create student account (email: [your-student-email])
- [ ] Verify auto-assignment works (student → instructor)

---

### Task 9.2: Test Student Flow

- [ ] Login as student
- [ ] Click "Load Demo Data" → select instructor
- [ ] Verify 7-10 flights appear
- [ ] Check weather alerts populate
- [ ] Test notification dropdown
- [ ] Generate AI suggestions
- [ ] Confirm reschedule
- [ ] Cancel a flight
- [ ] Check email notifications

---

### Task 9.3: Test Instructor Flow

- [ ] Login as instructor
- [ ] Verify same flights appear on dashboard
- [ ] Check notifications appear for student actions
- [ ] Test read-only AI suggestions view
- [ ] Cancel a flight as instructor
- [ ] Verify student receives notification

---

### Task 9.4: Test Training Level Changes

- [ ] Login as student
- [ ] Open Settings → change training level to "Private Pilot"
- [ ] Verify flights disappear from instructor dashboard
- [ ] Verify weather status recalculated
- [ ] Verify AI suggestions cleared
- [ ] Change back to "Student Pilot"
- [ ] Verify flights reappear on instructor dashboard
- [ ] Verify no notifications sent during changes

---

### Task 9.5: Test Real-Time Updates

- [ ] Open student dashboard in one browser
- [ ] Open instructor dashboard in another browser
- [ ] Make changes in one → verify updates in other
- [ ] Test: reschedule, cancel, training level change

---

## Phase 10: Documentation & Cleanup

### Task 10.1: Update README

- [ ] Document new role-based authentication
- [ ] Add setup instructions for instructor accounts
- [ ] Document training level change feature
- [ ] Add demo flow instructions

**Files to modify:**

- `README.md`

---

### Task 10.2: Clean Up Old Code

- [ ] Remove any student-specific hardcoded values
- [ ] Remove old demo data generation (if different)
- [ ] Clean up unused imports
- [ ] Run linter and fix issues

---

### Task 10.3: Environment Variables Check

- [ ] Verify all Firebase config vars are set
- [ ] Verify OpenAI API key is set
- [ ] Verify Weather API key is set
- [ ] Update `.env.template` if needed

---

## Phase 11: Deployment

### Task 11.1: Deploy Backend

```bash
# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Deploy Cloud Functions
firebase deploy --only functions
```

---

### Task 11.2: Deploy Frontend

```bash
# Build and deploy to Vercel
npm run build
# Push to main branch (auto-deploys if connected to Vercel)
git add .
git commit -m "Implement role-based dashboard with instructor oversight"
git push origin main
```

---

### Task 11.3: Final Verification

- [ ] Test production deployment
- [ ] Create fresh test accounts
- [ ] Run through complete demo flow
- [ ] Verify emails are sent
- [ ] Check all features work in production

---

## Critical Dependencies

### Dependency Map

```
Phase 1 (Database) → Must complete before Phase 2
Phase 2 (Auth) → Must complete before Phase 3
Phase 3 (Queries) → Must complete before Phase 4, 5
Phase 4 (Notifications) → Can run parallel with Phase 5
Phase 5 (Mock Data) → Can run parallel with Phase 4
Phase 6 (Settings) → Depends on Phase 3, Phase 8.2
Phase 7 (UI) → Depends on Phase 3
Phase 8 (Functions) → Can start after Phase 1
Phase 9 (Testing) → After all phases complete
Phase 10 (Docs) → After Phase 9
Phase 11 (Deploy) → Final step
```

---

## Estimated Timeline

| Phase     | Tasks               | Est. Time       | Priority     |
| --------- | ------------------- | --------------- | ------------ |
| Phase 1   | Database Schema     | 1-2 hours       | **Critical** |
| Phase 2   | Auth & Roles        | 1-2 hours       | **Critical** |
| Phase 3   | Dashboard Queries   | 2-3 hours       | **Critical** |
| Phase 4   | Notifications       | 3-4 hours       | **High**     |
| Phase 5   | Mock Data           | 2-3 hours       | **High**     |
| Phase 6   | Settings & Training | 3-4 hours       | **High**     |
| Phase 7   | Role-Based UI       | 2-3 hours       | **Medium**   |
| Phase 8   | Cloud Functions     | 2-3 hours       | **High**     |
| Phase 9   | Testing             | 3-4 hours       | **Critical** |
| Phase 10  | Documentation       | 1-2 hours       | **Medium**   |
| Phase 11  | Deployment          | 1 hour          | **Critical** |
| **Total** | **11 Phases**       | **22-31 hours** | -            |

---

## Quick Start Checklist

**Before starting:**

- [ ] Read final PRD (`docs/clearskies-final-prd.md`)
- [ ] Backup current database (export Firestore data)
- [ ] Create new git branch: `git checkout -b refactor/role-based-dashboard`
- [ ] Ensure Firebase CLI is installed and logged in

**Start with:**

1. Phase 1: Update database schema and types
2. Phase 2: Add role selection to signup
3. Phase 3: Update dashboard queries

**Checkpoint after Phase 3:**

- [ ] Both roles can login
- [ ] Students see own flights
- [ ] Instructors see assigned students' flights

---

## Notes & Considerations

### Important Reminders

- No transactions needed for training level updates (per user requirement)
- Training level changes do NOT trigger notifications
- Completed/cancelled flights retain original training level (historical)
- Only scheduled flights are updated when training level changes
- Mock data should be deletable and regeneratable
- Notifications appear for both student and instructor (if assigned)

### Testing Strategy

- Use two different browsers (or incognito) for simultaneous testing
- Keep instructor account simple (one instructor total)
- Focus on real-time updates (Firestore listeners)
- Test training level changes thoroughly (main demo feature)

---

**End of Task List**

Ready to begin implementation!
