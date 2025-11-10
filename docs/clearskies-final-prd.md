# **ClearSkies — Final Product Requirements Document**

## **Project Overview**

**Product Name:** ClearSkies  
**Purpose:** AI-powered flight scheduling system that monitors weather, detects conflicts, and generates reschedule suggestions based on pilot training levels.  
**Target:** Demo for portfolio/project presentation  
**Timeline:** Production-ready implementation

---

## **1. Core Objectives**

- ✅ **Automate** weather monitoring and flight conflict detection
- ✅ **Notify** affected students and instructors in real-time
- ✅ **Generate** AI-powered rescheduling options based on training levels
- ✅ **Track** all booking, cancellation, and reschedule data
- ✅ **Display** active flight and weather alerts in a role-based dashboard

---

## **2. Success Criteria**

- ✅ Weather conflicts are automatically and accurately detected
- ✅ Notifications are sent to students and instructors (email + in-app)
- ✅ AI suggests 3 optimal rescheduling times
- ✅ Database accurately updates bookings and logs all actions
- ✅ Dashboard displays live weather alerts and flight statuses
- ✅ AI logic correctly considers training level (stricter limits for Student Pilots)

---

## **3. User Roles & Authentication**

### **3.1 Role Types**

| Role           | Description                                         | Access Level                   |
| -------------- | --------------------------------------------------- | ------------------------------ |
| **Student**    | Pilot scheduling flights                            | See own flights only           |
| **Instructor** | Flight school staff managing Student Pilot students | See assigned students' flights |

### **3.2 Signup/Login Flow**

**Signup:**

- Email/password fields
- Role selector: `○ Student  ○ Instructor`
- Students get default `trainingLevel: "student"`
- Students with `trainingLevel: "student"` auto-assigned to first available instructor
- Redirects to `/dashboard`

**Login:**

- Email/password authentication
- No role selection (role retrieved from database)
- Redirects to `/dashboard`

### **3.3 Demo Accounts**

User creates two accounts manually:

1. **Instructor Account** (created first)
2. **Student Account** (auto-assigned to instructor)

---

## **4. Training Level Logic**

### **4.1 Training Level Rules**

**Students can change training level in Settings:**

- Options: `Student Pilot`, `Private Pilot`, `Instrument Rated`
- Changes trigger Cloud Function to update all scheduled bookings
- Weather status recalculated immediately for all scheduled flights
- AI reschedule suggestions cleared (will regenerate based on new training level)
- Completed/cancelled flights retain original training level (historical record)

### **4.2 Instructor Assignment Logic**

| Student Training Level | Assigned Instructor? | Appears on Instructor Dashboard? |
| ---------------------- | -------------------- | -------------------------------- |
| **Student Pilot**      | ✅ Yes               | ✅ Yes                           |
| **Private Pilot**      | ❌ No                | ❌ No                            |
| **Instrument Rated**   | ❌ No                | ❌ No                            |

**Behavior:**

- When student changes from "Student" → "Private" or "Instrument":

  - `assignedInstructor` field cleared
  - Flights disappear from instructor dashboard (real-time)
  - Weather status recalculated based on new minimums
  - AI suggestions deleted (no longer valid for new training level)
  - No notifications sent

- When student changes back to "Student":
  - `assignedInstructor` reassigned to instructor
  - Flights reappear on instructor dashboard
  - Weather status recalculated
  - No notifications sent

**Purpose:** Demo feature to showcase training level impact on weather safety without multiple logins.

---

## **5. Mock Data Generation**

### **5.1 Demo Data Setup**

**"Load Demo Data" Button:**

- Visible on student dashboard when no flights exist
- Opens modal with instructor dropdown selection
- Only one instructor exists (demo scenario)
- Student selects instructor and confirms

**Generated Data:**

- 7-10 flight bookings for the student
- Mix of dates/times (next 2 weeks)
- Various airports (PAO, SQL, RHV, SJC)
- Weather statuses: 3 safe, 2-3 caution, 2-3 unsafe
- Pre-generated AI suggestions for unsafe/caution flights
- Initial `trainingLevel: "student"` for all bookings
- All flights assigned to selected instructor

**Data Persistence:**

- Mock data persists until student clicks "Load Demo Data" again
- Clicking again deletes old data and regenerates new data
- All real-time updates (reschedules, cancellations) persist normally

**Instructor View:**

- Mock data appears automatically on instructor dashboard (real-time listener)
- Shows all scheduled flights for assigned Student Pilot students
- If student changes training level, flights disappear/reappear automatically

---

## **6. Dashboard Layout**

### **6.1 Dashboard Header**

```
┌──────────────────────────────────────────────────────┐
│ ✈️ ClearSkies         [🔔 3]  ⚙️ Settings  🚪 Logout │
│ Flight Operations Dashboard                          │
│ Welcome, [User Name] ([Role])                        │
└──────────────────────────────────────────────────────┘
```

**Notifications Dropdown (Bell Icon):**

- Shows last 10 unread notifications
- Real-time badge count
- Types: `weather_alert`, `reschedule_confirmation`, `cancellation`
- Click notification → navigate to related flight
- "Mark all as read" button
- Updates in real-time via Firestore listener

### **6.2 Three-Column Layout**

```
┌─────────────────────────────────────────────────────┐
│         Upcoming Flights │ Weather Alerts │ AI Reschedule Options │
├──────────────────────────┼────────────────┼───────────────────────┤
│ All scheduled flights    │ Unsafe/caution │ Selected flight       │
│ Color-coded status       │ flights only   │ AI suggestions        │
│ Role-based actions       │ Manual refresh │ Confirm (students)    │
└──────────────────────────┴────────────────┴───────────────────────┘
```

---

## **7. Role-Based Permissions**

### **7.1 Student Permissions**

| Action                  | Allowed? | Implementation                              |
| ----------------------- | -------- | ------------------------------------------- |
| View own flights        | ✅ Yes   | Query: `where("studentId", "==", user.uid)` |
| View weather alerts     | ✅ Yes   | Own alerts only                             |
| Generate AI suggestions | ✅ Yes   | For caution/unsafe flights                  |
| Confirm reschedule      | ✅ Yes   | Updates booking date/time                   |
| Cancel flight           | ✅ Yes   | Confirmation modal (no reason field)        |
| Change training level   | ✅ Yes   | Triggers Cloud Function                     |
| Load demo data          | ✅ Yes   | Generate mock bookings                      |
| View other students     | ❌ No    | Filtered by studentId                       |

### **7.2 Instructor Permissions**

| Action                          | Allowed? | Implementation                                       |
| ------------------------------- | -------- | ---------------------------------------------------- |
| View assigned students' flights | ✅ Yes   | Query: `where("assignedInstructor", "==", user.uid)` |
| View weather alerts             | ✅ Yes   | All alerts for assigned students                     |
| View AI suggestions             | ✅ Yes   | Read-only, cannot confirm                            |
| Confirm reschedule              | ❌ No    | Students manage reschedules                          |
| Cancel any flight               | ✅ Yes   | Confirmation modal (no reason field)                 |
| Change training level           | ❌ No    | Students only                                        |
| Load demo data                  | ❌ No    | Students only                                        |
| See metrics                     | ✅ Yes   | System-wide statistics                               |

---

## **8. Database Schema**

### **8.1 `students` Collection**

```typescript
{
  id: string;                    // Firebase Auth UID
  name: string;
  email: string;
  phone: string;
  role: "student" | "instructor";
  trainingLevel?: "student" | "private" | "instrument"; // students only
  assignedInstructor?: string;   // instructor UID (if trainingLevel === "student")
  createdAt: Timestamp;
  settings: {
    notifications: {
      emailWeatherAlerts: boolean;
      emailReschedule: boolean;
      emailWeatherImproved: boolean;
      inAppToasts: boolean;
    };
    theme: "light" | "dark";
    updatedAt: Timestamp;
  };
}
```

**Rules:**

- `assignedInstructor` is set automatically when `trainingLevel === "student"`
- `assignedInstructor` is cleared when training level changes to "private" or "instrument"
- Only one instructor exists for demo (auto-assigned to first instructor in system)

### **8.2 `bookings` Collection**

```typescript
{
  id: string;
  studentId: string;             // References students.id
  studentName: string;           // Denormalized for display
  trainingLevel: "student" | "private" | "instrument"; // Denormalized
  assignedInstructor?: string;   // Instructor UID (null if not Student Pilot)
  scheduledDate: string;         // "YYYY-MM-DD"
  scheduledTime: string;         // "09:00 AM"
  departureLocation: {
    name: string;
    lat: number;
    lon: number;
  };
  status: "scheduled" | "cancelled" | "completed";
  weatherStatus?: "safe" | "caution" | "unsafe" | null;
  lastWeatherCheck?: Timestamp;
  cancelledBy?: string;          // UID of who cancelled
  cancelledAt?: Timestamp;
  createdAt: Timestamp;
  lastModified?: Timestamp;
}
```

**Key Points:**

- `trainingLevel` and `assignedInstructor` are denormalized for efficient queries
- These fields update when student changes training level via Cloud Function
- Only `status: "scheduled"` bookings are updated on training level change
- Completed/cancelled bookings retain original training level (historical accuracy)

### **8.3 `notificationEvents` Collection**

```typescript
{
  id: string;
  userId: string; // student or instructor UID
  type: "weather_alert" | "reschedule_confirmation" | "cancellation";
  bookingId: string;
  message: string; // Display text
  read: boolean;
  createdAt: Timestamp;
}
```

**Usage:**

- Real-time listener for dropdown menu
- Query: `where("userId", "==", user.uid).where("read", "==", false).orderBy("createdAt", "desc").limit(10)`

### **8.4 `aiReschedules` Subcollection**

```typescript
// Path: bookings/{bookingId}/aiReschedules/{rescheduleId}
{
  id: string;
  studentId: string;
  studentName: string;
  trainingLevel: "student" | "private" | "instrument";
  explanation: string;           // AI-generated explanation
  suggestions: [
    {
      date: string;              // "YYYY-MM-DD"
      time: string;              // "09:00 AM"
      reason: string;            // Why this time is recommended
    }
  ];
  createdAt: Timestamp;
}
```

**Lifecycle:**

- Created when user clicks "Generate AI suggestions"
- **Deleted when student changes training level** (suggestions no longer valid)
- Pre-generated during mock data creation for demo purposes

---

## **9. Weather Safety Logic (Deterministic)**

### **9.1 Weather Minimums by Training Level**

| Training Level       | Visibility | Wind Speed | Ceiling            | Special Conditions         |
| -------------------- | ---------- | ---------- | ------------------ | -------------------------- |
| **Student Pilot**    | > 5 mi     | < 10 kt    | Clear to scattered | No precipitation, no fog   |
| **Private Pilot**    | > 3 mi     | < 20 kt    | > 1000 ft          | No thunderstorms           |
| **Instrument Rated** | > 1 mi     | Flexible   | IMC OK             | No thunderstorms, no icing |

### **9.2 Safety Evaluation Function**

```typescript
function evaluateWeatherSafety(
  weather: WeatherData,
  trainingLevel: TrainingLevel
): { status: SafetyStatus; violations: string[] } {
  const violations: string[] = [];

  // Student Pilot checks
  if (trainingLevel === "student") {
    if (weather.visibility < 5) {
      violations.push(`Visibility ${weather.visibility} mi (requires > 5 mi)`);
    }
    if (weather.windSpeed > 10) {
      violations.push(`Wind ${weather.windSpeed} kt (max 10 kt)`);
    }
    if (weather.hasPrecipitation) {
      violations.push("Precipitation detected (not allowed)");
    }
    if (violations.length > 0) {
      return { status: "unsafe", violations };
    }
    if (weather.cloudCover > 50) {
      return { status: "caution", violations: ["Scattered clouds"] };
    }
    return { status: "safe", violations: [] };
  }

  // Private Pilot checks
  if (trainingLevel === "private") {
    if (weather.visibility < 3) {
      violations.push(`Visibility ${weather.visibility} mi (requires > 3 mi)`);
    }
    if (weather.windSpeed > 20) {
      violations.push(`Wind ${weather.windSpeed} kt (max 20 kt)`);
    }
    if (weather.ceiling < 1000) {
      violations.push(`Ceiling ${weather.ceiling} ft (requires > 1000 ft)`);
    }
    if (weather.hasThunderstorms) {
      violations.push("Thunderstorms detected");
    }
    if (violations.length > 0) {
      return { status: "unsafe", violations };
    }
    if (weather.windSpeed > 15) {
      return { status: "caution", violations: ["High wind speeds"] };
    }
    return { status: "safe", violations: [] };
  }

  // Instrument Rated checks
  if (trainingLevel === "instrument") {
    if (weather.hasThunderstorms) {
      violations.push("Thunderstorms detected");
    }
    if (weather.hasIcing) {
      violations.push("Icing conditions");
    }
    if (violations.length > 0) {
      return { status: "unsafe", violations };
    }
    if (weather.visibility < 1) {
      return { status: "caution", violations: ["Very low visibility"] };
    }
    return { status: "safe", violations: [] };
  }
}
```

**Critical:** NO AI INVOLVEMENT — This is pure deterministic logic.

---

## **10. AI Behavior**

### **10.1 AI's Role (OpenAI API)**

**AI ONLY generates:**

1. Human-readable explanations of why flight is unsafe/caution
2. 3 reschedule suggestions with dates/times and reasoning
3. Training-level-aware messaging

**AI DOES NOT:**

- Check weather data
- Determine flight safety
- Access WeatherAPI directly
- Make booking decisions

### **10.2 AI Prompt Template**

```
You are a flight scheduling assistant for ClearSkies.

Flight Details:
- Student: {studentName} ({trainingLevel})
- Original Date: {date} at {time}
- Location: {airportName}

Weather Violations (determined by safety logic):
{violations array, e.g.:
  - "Visibility 3 mi (requires > 5 mi for Student Pilots)"
  - "Wind 15 kt (max 10 kt for Student Pilots)"
}

Task:
1. Write a brief explanation (2-3 sentences) of why this flight was unsafe for a {trainingLevel}, explicitly mentioning their training level and the specific violations.
2. Suggest 3 alternative dates/times within the next 7 days when weather conditions are typically better.
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

**Demo Implementation:**

- AI suggestions are pre-generated during mock data creation
- Stored in `aiReschedules` subcollection
- No live OpenAI calls needed during demo (faster, more reliable)
- Suggestions are cleared when student changes training level

---

## **11. Cloud Functions**

### **11.1 Scheduled Functions**

**1. `checkScheduledFlights`** (every 1 hour)

```typescript
// Trigger: Cloud Scheduler (cron: "0 * * * *")
async function checkScheduledFlights() {
  // 1. Query all bookings with status === "scheduled"
  // 2. For each booking:
  //    a. Fetch weather data from WeatherAPI
  //    b. Evaluate safety using trainingLevel
  //    c. Update weatherStatus field
  //    d. If unsafe/caution: enqueue notification
  // 3. Log results
}
```

**2. `processNotificationQueue`** (every 5 minutes)

```typescript
// Trigger: Cloud Scheduler (cron: "*/5 * * * *")
async function processNotificationQueue() {
  // 1. Query pending notifications
  // 2. For each notification:
  //    a. Fetch student/instructor email
  //    b. Check notification preferences
  //    c. Render email template
  //    d. Send via Nodemailer
  //    e. Create notificationEvent document
  //    f. Mark as sent
  // 3. Handle failures with retry logic
}
```

### **11.2 Callable Functions**

**1. `manualWeatherCheck`** (HTTP callable)

```typescript
// Trigger: User clicks "Check weather now"
async function manualWeatherCheck(data, context) {
  // 1. Authenticate user
  // 2. Fetch booking by ID
  // 3. Get real-time weather data
  // 4. Evaluate safety based on booking.trainingLevel
  // 5. Update weatherStatus
  // 6. Enqueue notification if changed
  // 7. Return updated status
}
```

**2. `generateRescheduleSuggestions`** (HTTP callable)

```typescript
// Trigger: User clicks "Generate AI suggestions"
async function generateRescheduleSuggestions(data, context) {
  // 1. Authenticate user
  // 2. Fetch booking details
  // 3. Build prompt with trainingLevel + violations
  // 4. Call OpenAI API
  // 5. Validate response (must have 3 suggestions)
  // 6. Store in aiReschedules subcollection
  // 7. Return suggestions
}
```

**3. `updateTrainingLevel`** (HTTP callable) **[NEW]**

```typescript
// Trigger: Student changes training level in Settings
async function updateTrainingLevel(data, context) {
  const { newTrainingLevel } = data;
  const userId = context.auth.uid;

  // 1. Authenticate user (must be student role)
  // 2. Update student document:
  //    - trainingLevel = newTrainingLevel
  //    - assignedInstructor = (newTrainingLevel === "student" ? instructorId : null)

  // 3. Query all scheduled bookings for this student
  // 4. Batch update:
  //    - trainingLevel = newTrainingLevel
  //    - assignedInstructor = (newTrainingLevel === "student" ? instructorId : null)
  //    - Clear weatherStatus (will be recalculated)

  // 5. Delete all AI reschedule suggestions (no longer valid)
  //    - Query aiReschedules subcollections for all bookings
  //    - Delete documents

  // 6. Trigger weather re-evaluation for all scheduled flights
  //    - Call evaluateWeatherSafety for each booking
  //    - Update weatherStatus based on new training level

  // 7. Return success
}
```

**Important:** No transaction needed (per user requirement). Updates applied sequentially but not atomically.

---

## **12. Notifications System**

### **12.1 Notification Types**

| Type                        | Triggered When                     | Recipients                         | Channels       | Training Level Change? |
| --------------------------- | ---------------------------------- | ---------------------------------- | -------------- | ---------------------- |
| **weather_alert**           | Weather check flags unsafe/caution | Student + Instructor (if assigned) | Email + In-app | ❌ No                  |
| **reschedule_confirmation** | Student confirms reschedule        | Student + Instructor (if assigned) | Email + In-app | ❌ No                  |
| **cancellation**            | Flight is cancelled                | Student + Instructor (if assigned) | Email + In-app | ❌ No                  |

**Key Rule:** Training level changes do NOT trigger notifications.

### **12.2 Email Templates**

**From:** ClearSkies Notifications <noreply@clearskies.app>  
**Reply-To:** {instructor email} (so students can reply directly)

**Weather Alert Email:**

```
Subject: ⚠️ Weather Alert — Flight {date} Flagged for Review

Hi {studentName},

Your flight on {date} at {time} has been flagged due to weather
conditions below the minimums for {trainingLevel}.

Flight Details:
• Location: {airport}
• Training Level: {trainingLevel}

Weather Issues:
{violations list}

We've generated alternative times when conditions will be safer.

[View Reschedule Options]
```

**Reschedule Confirmation Email:**

```
Subject: ✅ Flight Rescheduled — {newDate}

Hi {studentName},

Your flight has been successfully rescheduled.

New Flight Details:
• Date: {newDate}
• Time: {newTime}
• Location: {airport}

Add this to your calendar.
```

**Cancellation Email:**

```
Subject: ❌ Flight Cancelled — {date}

Hi {studentName},

Your flight on {date} at {time} has been cancelled.

Cancelled by: {cancellerName}

Please contact your flight school to reschedule.
```

---

## **13. Firestore Security Rules**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserDoc() {
      return get(/databases/$(database)/documents/students/$(request.auth.uid)).data;
    }

    function isInstructor() {
      return isAuthenticated() && getUserDoc().role == "instructor";
    }

    function isStudent() {
      return isAuthenticated() && getUserDoc().role == "student";
    }

    // Students collection
    match /students/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }

    // Bookings collection
    match /bookings/{bookingId} {
      // Students read own bookings
      allow read: if isStudent() && resource.data.studentId == request.auth.uid;

      // Instructors read assigned students' bookings
      allow read: if isInstructor() &&
                     resource.data.assignedInstructor == request.auth.uid;

      // Students create/update own bookings
      allow create, update: if isStudent() &&
                              request.resource.data.studentId == request.auth.uid;

      // Instructors update assigned bookings (for cancellation)
      allow update: if isInstructor() &&
                      resource.data.assignedInstructor == request.auth.uid;

      // No deletes for anyone
      allow delete: if false;

      // AI reschedules subcollection
      match /aiReschedules/{rescheduleId} {
        allow read: if isAuthenticated();
        allow write: if isAuthenticated();
      }
    }

    // Notification events
    match /notificationEvents/{eventId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow write: if false; // Cloud Functions only
    }

    // Notification queue (Cloud Functions only)
    match /notificationQueue/{queueId} {
      allow read, write: if false;
    }
  }
}
```

---

## **14. Settings Page**

### **14.1 Student Settings**

```
┌─────────────────────────────────────┐
│ ⚙️ Settings                          │
├─────────────────────────────────────┤
│ PROFILE                             │
│ ├─ Name: [Display only]             │
│ ├─ Email: [Display only]           │
│ ├─ Phone: [(555) 123-4567]          │
│ └─ Training Level: [Student Pilot▼] │
│                                     │
│    Current Weather Minimums:        │
│    • Visibility: > 5 miles          │
│    • Wind Speed: < 10 knots         │
│    • Ceiling: Clear to scattered     │
│                                     │
│    ⚠️ Changing from Student Pilot   │
│    will remove flights from          │
│    instructor oversight and reset   │
│    all weather assessments.          │
│                                     │
│ NOTIFICATIONS                       │
│ ├─ 📧 Email: Weather Alerts [✓]     │
│ ├─ 📧 Email: Reschedules [✓]        │
│ └─ 💬 In-App: Toasts [✓]            │
│                                     │
│ DISPLAY                             │
│ └─ 🌙 Dark Mode [toggle]            │
│                                     │
│     [Save Changes]  [Cancel]        │
└─────────────────────────────────────┘
```

**Save Changes Flow:**

1. User changes training level dropdown
2. Clicks "Save Changes"
3. Frontend calls `updateTrainingLevel` Cloud Function
4. Loading indicator appears
5. Cloud Function:
   - Updates student document
   - Updates all scheduled bookings
   - Deletes AI suggestions
   - Recalculates weather status
6. Success toast: "Settings saved. Weather assessments updated."
7. Dashboard refreshes automatically (Firestore listeners)

### **14.2 Instructor Settings**

```
┌─────────────────────────────────────┐
│ ⚙️ Settings                          │
├─────────────────────────────────────┤
│ PROFILE                             │
│ ├─ Name: [Display only]             │
│ ├─ Email: [Display only]            │
│ └─ Phone: [(555) 987-6543]          │
│                                     │
│ NOTIFICATIONS                       │
│ ├─ 📧 Email: Weather Alerts [✓]     │
│ ├─ 📧 Email: Cancellations [✓]      │
│ └─ 💬 In-App: Toasts [✓]            │
│                                     │
│ DISPLAY                             │
│ └─ 🌙 Dark Mode [toggle]            │
│                                     │
│     [Save Changes]  [Cancel]        │
└─────────────────────────────────────┘
```

---

## **15. Mock Data Generation**

### **15.1 "Load Demo Data" Flow**

**Student Dashboard (when no flights exist):**

```
┌─────────────────────────────────────┐
│ No flights scheduled                │
│                                     │
│ Load demo flights to explore        │
│ ClearSkies.                         │
│                                     │
│    [Load Demo Data]                 │
└─────────────────────────────────────┘
```

**Modal on Click:**

```
┌─────────────────────────────────────┐
│ Generate Demo Data                  │
├─────────────────────────────────────┤
│ Select your assigned instructor:     │
│                                     │
│ [John Smith (Instructor)      ▼]    │
│                                     │
│ This will create 7-10 sample        │
│ flights with varied weather         │
│ conditions. Existing flights will    │
│ be deleted.                         │
│                                     │
│  [Generate]  [Cancel]               │
└─────────────────────────────────────┘
```

**After Generation:**

- 7-10 bookings created
- All assigned to selected instructor
- Mix of safe, caution, unsafe statuses
- Pre-generated AI suggestions for unsafe flights
- Notification events created
- Instructor dashboard shows flights immediately (real-time listener)

### **15.2 Generated Data Structure**

**7-10 Bookings:**

- 3 Safe flights (good weather)
- 2-3 Caution flights (borderline conditions)
- 2-3 Unsafe flights (clear violations)

**Locations (Real CA airports):**

- PAO: Palo Alto Airport (37.4611, -122.1150)
- SQL: San Carlos Airport (37.5119, -122.2506)
- RHV: Reid-Hillview Airport (37.3329, -121.8191)
- SJC: San Jose International (37.3626, -121.9290)

**Dates:**

- Next 14 days
- Mix of morning/afternoon times

**Pre-generated AI Suggestions:**

- Stored in `aiReschedules` subcollection
- 3 suggestions per unsafe flight
- Training-level-aware explanations

---

## **16. Dashboard Metrics (Instructor View)**

```
┌───────────────────────────────────────────┐
│ SYSTEM METRICS                Updated: Now│
├───────────────────────────────────────────┤
│ 📅 Total Bookings: 47                     │
│ ⚠️ Weather Conflicts: 12                  │
│ ✅ Successful Reschedules: 8              │
│ ⏱️ Avg Rescheduling Time: 24 min           │
│                                           │
│ Training Level Breakdown:                 │
│ • Student Pilots: 8 alerts (67%)           │
│ • Private Pilots: 3 alerts (25%)          │
│ • Instrument Rated: 1 alert (8%)          │
└───────────────────────────────────────────┘
```

**Calculations (Real-time):**

- Count documents in Firestore collections
- Simple aggregations (no caching needed for demo)

---

## **17. Cancellation Flow**

### **17.1 Cancel Button UI**

**Student View:**

- "Cancel" button on each flight card
- Opens confirmation modal (no reason field)

**Instructor View:**

- "Cancel" button on each flight card
- Opens confirmation modal (no reason field)

### **17.2 Confirmation Modal**

```
┌─────────────────────────────────────┐
│ Cancel Flight                       │
├─────────────────────────────────────┤
│ Are you sure you want to cancel     │
│ this flight?                        │
│                                     │
│ Student: {studentName}              │
│ Date: {date} at {time}              │
│ Location: {airport}                 │
│                                     │
│ This action cannot be undone.      │
│                                     │
│  [Yes, Cancel Flight]  [Nevermind]  │
└─────────────────────────────────────┘
```

**On Confirmation:**

1. Update booking: `status = "cancelled"`, `cancelledBy = user.uid`, `cancelledAt = Timestamp`
2. Enqueue cancellation notification
3. Show success toast
4. Flight disappears from Upcoming Flights
5. Notification sent to student (and instructor if applicable)

---

## **18. Key Implementation Details**

### **18.1 Real-Time Updates**

**All dashboard data uses Firestore real-time listeners:**

```typescript
// Student View
const upcomingQuery = query(
  collection(db, "bookings"),
  where("studentId", "==", user.uid),
  where("status", "==", "scheduled"),
  orderBy("scheduledDate"),
  orderBy("scheduledTime")
);

// Instructor View
const assignedQuery = query(
  collection(db, "bookings"),
  where("assignedInstructor", "==", user.uid),
  where("status", "==", "scheduled"),
  orderBy("scheduledDate"),
  orderBy("scheduledTime")
);

// Notifications
const notificationsQuery = query(
  collection(db, "notificationEvents"),
  where("userId", "==", user.uid),
  where("read", "==", false),
  orderBy("createdAt", "desc"),
  limit(10)
);
```

**Result:** Both student and instructor see updates instantly without page refresh.

### **18.2 Training Level Change Sequence**

```
User clicks "Save Changes" in Settings
    ↓
Frontend calls updateTrainingLevel Cloud Function
    ↓
Cloud Function updates student document
    ↓
Cloud Function updates all scheduled bookings (batch)
    ↓
Cloud Function deletes AI reschedule suggestions
    ↓
Cloud Function triggers weather re-evaluation
    ↓
Firestore listeners detect changes
    ↓
Student dashboard refreshes automatically
    ↓
Instructor dashboard refreshes automatically
    ↓
Flights appear/disappear based on assignedInstructor
```

---

## **19. Deliverables**

- ✅ Deployed frontend (Vercel)
- ✅ Deployed backend (Firebase Functions)
- ✅ Firestore database with indexes
- ✅ Security rules deployed
- ✅ README.md with setup instructions
- ✅ .env.template file
- ✅ Database schema documentation (this document)
- ✅ Two functional demo accounts (student + instructor)

---

## **20. Demo Flow Summary**

1. **Login as Student** → Dashboard shows "Load Demo Data" button
2. **Generate Mock Data** → Select instructor → 7-10 flights appear
3. **Show Dashboard** → Upcoming flights, weather alerts, notifications
4. **Open Settings** → Show current training level (Student Pilot)
5. **Show Weather Minimums** → Point to strict requirements (5 mi, 10 kt)
6. **Login as Instructor** (separate window) → Shows same flights
7. **Student Changes Training Level** → Private Pilot
8. **Instructor Dashboard Refreshes** → Flights disappear (real-time)
9. **Student Changes Back** → Student Pilot
10. **Instructor Dashboard Refreshes** → Flights reappear
11. **Click Weather Alert** → Generate AI suggestions
12. **Show AI Explanation** → Explicitly mentions "Student Pilot"
13. **Confirm Reschedule** → Flight updates in real-time
14. **Instructor Cancels Flight** → Student receives notification
15. **Show Emails** → Weather alert, reschedule confirmation emails

**Purpose:** Showcase role-based access, training level impact on safety, AI reasoning, and real-time synchronization.

---

**End of Final PRD**
