# ☀️ ClearSkies

**AI-powered weather intelligence for safer, smarter flight training.**

ClearSkies is a modern web application that automates flight scheduling adjustments based on real-time weather conditions. It uses deterministic safety logic to flag unsafe flights and AI-powered recommendations to suggest optimal reschedule times.

---

## 🎯 Overview

Flight schools face constant disruptions due to weather. ClearSkies solves this by:

- **Automating** weather monitoring for all scheduled flights
- **Detecting** unsafe conditions based on student training levels
- **Notifying** affected students in real-time via email and in-app alerts
- **Generating** AI-powered reschedule suggestions with reasoning
- **Tracking** all bookings, cancellations, and reschedules for analysis

---

## 🚀 Tech Stack

| Layer              | Technology                              |
| ------------------ | --------------------------------------- |
| **Frontend**       | Next.js 14, React 18, TypeScript, TailwindCSS |
| **Backend**        | Firebase Functions (TypeScript, Node.js 20) |
| **Database**       | Firebase Firestore (NoSQL)              |
| **AI**             | OpenAI API (GPT-4o-mini)                |
| **Weather API**    | WeatherAPI.com                          |
| **Authentication** | Firebase Auth                           |
| **Scheduler**      | Firebase Cloud Scheduler                |
| **Email**          | Nodemailer (SMTP)                       |
| **Deployment**     | Vercel (frontend) + Firebase (backend)  |
| **Icons**          | Lucide React                            |
| **Notifications**  | React Toastify                          |

---

## 📋 Features

### Core Functionality

- ✅ **Hourly Weather Monitoring** — Automated checks for all upcoming flights via Cloud Scheduler
- ✅ **Smart Safety Logic** — Different thresholds for Student, Private, and Instrument Rated pilots
- ✅ **AI Rescheduling** — OpenAI generates 3 alternative times with explanations
- ✅ **Real-time Notifications** — Email + in-app toasts for weather alerts
- ✅ **Live Dashboard** — Color-coded flight status with real-time Firestore sync
- ✅ **User Settings** — Customize notification preferences and display options
- ✅ **Role-Based Access** — Students and Instructors with different permissions
- ✅ **Manual Weather Checks** — Trigger weather evaluation on-demand
- ✅ **Demo Data Seeding** — Load sample flights for testing

### Safety Thresholds by Training Level

| Training Level       | Visibility | Wind Speed | Ceiling            | Special Conditions         |
| -------------------- | ---------- | ---------- | ------------------ | -------------------------- |
| **Student Pilot**    | > 5 mi     | < 10 kt    | Clear to scattered | No precipitation, no fog   |
| **Private Pilot**    | > 3 mi     | < 20 kt    | > 1000 ft          | No thunderstorms           |
| **Instrument Rated** | > 1 mi     | Flexible   | IMC OK             | No thunderstorms, no icing |

### User Roles

- **Student**: Can view and manage their own flights, receive weather alerts, and confirm reschedules
- **Instructor**: Can view assigned students' flights and manage bookings

---

## 📁 Project Structure

```
clearskies-app/
├── docs/                           # Project documentation
│   ├── clearskies-prd.md           # Product Requirements Document
│   ├── clearskies-final-prd.md     # Final PRD
│   ├── clearskies-design-spec.md  # Design & UI specifications
│   ├── clearskies-task-list.md     # PR-by-PR implementation plan
│   ├── clearskies-refactor-tasks.md # Refactoring tasks
│   ├── database-schema.md          # Database schema documentation
│   ├── database-schema.svg         # ER diagram
│   ├── environment-config.md       # Environment configuration guide
│   └── ai-log.md                   # AI-assisted development log
├── src/                            # Next.js application source
│   ├── app/                        # Next.js App Router pages
│   │   ├── dashboard/              # Main dashboard page
│   │   ├── login/                  # Authentication page
│   │   ├── settings/               # User settings page
│   │   ├── learn/                  # Learning/resources page
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Home/landing page
│   │   └── globals.css             # Global styles
│   ├── components/                 # React components
│   │   ├── dashboard/             # Dashboard-specific components
│   │   │   ├── CancelBookingModal.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── LoadDemoDataModal.tsx
│   │   │   ├── NotificationsDropdown.tsx
│   │   │   ├── RescheduleOptions.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── UpcomingFlights.tsx
│   │   │   └── WeatherAlerts.tsx
│   │   └── Navbar.tsx              # Navigation component
│   ├── hooks/                      # Custom React hooks
│   │   ├── useAuthUser.ts          # Authentication hook
│   │   ├── useBookings.ts          # Bookings data hook
│   │   ├── useNotifications.ts     # Notifications hook
│   │   ├── useStudentSettings.ts   # Settings hook
│   │   └── useAiReschedules.ts    # AI reschedules hook
│   ├── lib/                        # Core libraries
│   │   ├── firebaseConfig.ts       # Firebase initialization
│   │   ├── weatherAPI.ts            # WeatherAPI.com client
│   │   ├── aiRescheduler.ts        # OpenAI integration
│   │   ├── cancelBooking.ts        # Booking cancellation
│   │   ├── confirmReschedule.ts    # Reschedule confirmation
│   │   ├── manualWeatherCheck.ts   # Manual weather check
│   │   ├── updateTrainingLevel.ts  # Training level update
│   │   ├── users.ts                # User utilities
│   │   └── toast.ts                # Toast notifications
│   ├── utils/                      # Utility functions
│   │   ├── weatherLogic.ts         # Safety evaluation logic
│   │   ├── format.ts                # Formatting utilities
│   │   ├── seedFirestore.ts        # Firestore seeding script
│   │   └── seedUserDemoData.ts     # User demo data seeding
│   ├── data/                       # Mock data and types
│   │   ├── mockData.ts             # Sample students & bookings
│   │   └── types.ts                # TypeScript type definitions
│   └── pages/                      # Legacy pages (if any)
│       └── api/                     # API routes
├── functions/                      # Firebase Cloud Functions
│   ├── src/                        # TypeScript source
│   │   ├── index.ts                # Main functions entry point
│   │   ├── clients/                # External API clients
│   │   │   └── weatherApi.ts       # WeatherAPI.com client
│   │   ├── logic/                  # Business logic
│   │   │   ├── evaluateWeatherSafety.ts
│   │   │   ├── aiRescheduler.ts
│   │   │   ├── notificationQueue.ts
│   │   │   └── notifications.ts
│   │   └── types.ts                # Type definitions
│   ├── lib/                        # Compiled JavaScript (generated)
│   ├── package.json                # Functions dependencies
│   └── tsconfig.json               # TypeScript config
├── scripts/                        # Utility scripts
│   ├── test-weather.ts             # Weather API testing
│   └── test-weather-logic.ts      # Weather logic testing
├── public/                         # Static assets
│   ├── logo.svg                    # ClearSkies logo
│   ├── favicon.svg                 # Favicon
│   └── images/                     # Image assets
├── firebase.json                   # Firebase configuration
├── firestore.rules                 # Firestore security rules
├── firestore.indexes.json          # Firestore indexes
├── .firebaserc                     # Firebase project aliases
├── next.config.js                  # Next.js configuration
├── tailwind.config.ts              # Tailwind CSS configuration
├── tsconfig.json                   # TypeScript configuration
├── package.json                    # Frontend dependencies
└── .env.local                      # Environment variables (not in git)
```

**Note:** The `functions/` directory is excluded from Next.js TypeScript compilation (see `tsconfig.json`). Firebase Functions are compiled and deployed separately to Firebase, not Vercel.

---

## 🛠️ Setup Instructions

### Prerequisites

- **Node.js** 18+ and npm
- **Firebase CLI** (`npm install -g firebase-tools`)
- **Git** for version control
- **Firebase Account** (Blaze plan required for Cloud Functions)
- **WeatherAPI.com Account** (free tier available)
- **OpenAI API Key** (requires paid account)

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd clearskies-app
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install Firebase Functions dependencies
cd functions
npm install
cd ..
```

### 3. Environment Variables

Create `.env.local` in the project root:

```bash
# Firebase Configuration (Frontend)
# Get these from: Firebase Console → Project Settings → Your apps → Web app
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=clearskies-app-b852c.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=clearskies-app-b852c
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=clearskies-app-b852c.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Get API Keys:**

- **Firebase:** [Firebase Console](https://console.firebase.google.com/project/clearskies-app-b852c/settings/general) → Project Settings → Your apps → Web app
- **WeatherAPI:** [weatherapi.com](https://www.weatherapi.com/) (free tier available)
- **OpenAI:** [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

**Note:** API keys for Cloud Functions should be set using `firebase functions:config:set` (see Firebase Setup section below).

### 4. Firebase Setup

#### 4.1. Create Firebase Project (if not already done)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Project name: `clearskies-app` (or your choice)
4. Enable/disable Google Analytics (optional)
5. Click "Create project"
6. **Important:** Upgrade to Blaze (pay-as-you-go) plan for Cloud Functions

#### 4.2. Enable Firebase Services

**Firestore Database:**

1. In Firebase Console, click "Firestore Database"
2. Click "Create database"
3. Select "Start in production mode" (we'll add rules)
4. Choose a location (e.g., `us-central1`)
5. Click "Enable"

**Authentication:**

1. Click "Authentication" → "Get started"
2. Go to "Sign-in method" tab
3. Enable "Email/Password" → Toggle "Enable" → Click "Save"

**Cloud Functions:**

1. Click "Functions" → "Get started"
2. Note: Cloud Functions requires Blaze (pay-as-you-go) plan
   - Free tier includes generous free allowance
   - You only pay for what you use beyond the free tier

#### 4.3. Get Firebase Configuration

1. Click gear icon ⚙️ → "Project settings"
2. Scroll to "Your apps" section
3. Click web icon `</>`
4. Register app: App nickname: `clearskies-web`
5. Copy the Firebase configuration object
6. Add these values to your `.env.local` file

#### 4.4. Initialize Firebase in Project

```bash
# Login to Firebase (if not already logged in)
firebase login

# Initialize Firebase project
firebase init

# Select:
# - Firestore: Configure security rules and indexes
# - Functions: Configure a Cloud Functions directory
# - Hosting: (optional) Configure files for Firebase Hosting
```

This creates:

- `firebase.json` - Firebase configuration
- `.firebaserc` - Project aliases
- `firestore.rules` - Security rules
- `firestore.indexes.json` - Index definitions

#### 4.5. Deploy Firestore Rules and Indexes

```bash
# Deploy Firestore configuration
firebase deploy --only firestore
```

This deploys:

- Security rules (students can only access their own data)
- Index definitions for efficient queries

#### 4.6. Set Functions Environment Variables

Cloud Functions need access to your API keys. Set them using Firebase CLI:

```bash
# Set WeatherAPI key
firebase functions:config:set weather.api_key="YOUR_WEATHERAPI_KEY"

# Set OpenAI key
firebase functions:config:set openai.api_key="YOUR_OPENAI_KEY"

# Optional: Set OpenAI model (defaults to gpt-4o-mini)
firebase functions:config:set openai.model="gpt-4o-mini"

# Verify configuration
firebase functions:config:get
```

**Access in Functions Code:**

```typescript
import * as functions from "firebase-functions";

const weatherApiKey = functions.config().weather.api_key;
const openaiApiKey = functions.config().openai.api_key;
```

#### 4.7. Configure Email Notifications (Optional)

Email notifications require SMTP configuration. This is optional - the app will work without it, but email notifications won't be sent.

```bash
# Set SMTP configuration for email notifications
firebase functions:config:set smtp.host="smtp.gmail.com"
firebase functions:config:set smtp.port="587"
firebase functions:config:set smtp.user="your-email@gmail.com"
firebase functions:config:set smtp.pass="your-app-password"
firebase functions:config:set smtp.from="ClearSkies <noreply@yourdomain.com>"
```

**For Gmail:**
1. Enable 2-factor authentication
2. Generate an "App Password" (not your regular password)
3. Use the app password in `smtp.pass`

**Note:** Without SMTP configuration, email notifications will be queued but not sent. The app will continue to function normally with in-app notifications.

#### 4.8. Deploy Functions (when ready)

```bash
# Build and deploy functions
firebase deploy --only functions

# Or deploy everything
firebase deploy
```

#### 4.9. Firebase Project Information

- **Project ID:** `clearskies-app-b852c`
- **Project Console:** https://console.firebase.google.com/project/clearskies-app-b852c/overview

**Firestore Collections:**

- `students` - Student user data
- `bookings` - Flight booking records
- `bookings/{id}/aiReschedules` - AI reschedule suggestions (subcollection)
- `notificationQueue` - Pending email notifications
- `notificationEvents` - Notification audit log
- `errorLogs` - Error logging (managed by Cloud Functions)

**Security Rules:**

- Students can only read/write their own data
- Students can only access their own bookings
- Error logs are only accessible by Cloud Functions (admin SDK)

### 5. Seed Mock Data (Development)

```bash
# Seed Firestore with mock data
npm run seed

# Or seed with Firestore emulator
npm run seed:emulator
```

This populates your Firestore database with:
- Sample students (8 students with different training levels)
- Sample flight bookings (15 bookings with various statuses)
- Demo data for testing

### 6. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 7. Available Scripts

```bash
# Development
npm run dev              # Start Next.js development server
npm run build            # Build Next.js for production
npm run start            # Start Next.js production server
npm run lint             # Run ESLint

# Data Seeding
npm run seed             # Seed Firestore with mock data
npm run seed:emulator    # Seed Firestore emulator

# Testing
npm run weather:test      # Test WeatherAPI integration
npm run weather:logic:test # Test weather safety logic

# Firebase Functions (from functions/ directory)
cd functions
npm run build            # Build TypeScript
npm run serve            # Run functions emulator
npm run deploy           # Deploy functions to Firebase
npm run logs             # View function logs
```

---

## 🚢 Deployment

### Frontend (Vercel)

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**
   - In Vercel project settings, add all `NEXT_PUBLIC_*` variables from `.env.local`
   - Variables needed:
     - `NEXT_PUBLIC_FIREBASE_API_KEY`
     - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
     - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
     - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
     - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
     - `NEXT_PUBLIC_FIREBASE_APP_ID`

4. **Deploy**
   - Vercel will automatically deploy on every push to `main`
   - Or manually trigger deployment from the dashboard

**Note:** The `functions/` directory is excluded from the Next.js build (see `tsconfig.json`). This is correct - Firebase Functions are deployed separately.

### Backend (Firebase)

```bash
# Deploy all Firebase services
firebase deploy

# Or deploy individually
firebase deploy --only functions
firebase deploy --only firestore
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### Cloud Scheduler Setup

The `checkWeatherStatus` function should be scheduled to run hourly:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Functions** → **Logs**
3. In Google Cloud Console, go to **Cloud Scheduler**
4. Create a new job:
   - **Name:** `check-weather-hourly`
   - **Frequency:** `0 * * * *` (every hour)
   - **Target:** `checkWeatherStatus` function
   - **Region:** Same as your functions

Alternatively, you can use Firebase CLI to create the scheduler:

```bash
gcloud scheduler jobs create http check-weather-hourly \
  --schedule="0 * * * *" \
  --uri="https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/checkWeatherStatus" \
  --http-method=POST \
  --oidc-service-account-email=YOUR_PROJECT@appspot.gserviceaccount.com
```

---

## 📊 Database Schema

### Students Collection

**Document ID:** `{userId}` (Firebase Auth UID)

```typescript
{
  id: string;                    // Firebase Auth UID
  name: string;                  // Full name
  email: string;                 // Email address
  phone: string;                 // Phone number (formatted)
  role: "student" | "instructor"; // User role
  trainingLevel?: "student" | "private" | "instrument";
  assignedInstructor?: string;   // Instructor ID (for students)
  createdAt: Timestamp;
  settings?: {
    notifications: {
      emailWeatherAlerts: boolean;
      emailReschedule: boolean;
      emailWeatherImproved: boolean;
      inAppToasts: boolean;
    };
    theme: "light" | "dark";
    updatedAt?: Timestamp;
  };
}
```

### Bookings Collection

**Document ID:** Auto-generated (e.g., `booking-001`)

```typescript
{
  id: string;
  studentId: string;             // References students.id
  studentName: string;           // Denormalized for quick access
  trainingLevel?: "student" | "private" | "instrument";
  scheduledDate: string;         // ISO date format (YYYY-MM-DD)
  scheduledTime: string;         // Time format (e.g., "09:00 AM")
  departureLocation: {
    name: string;                // Airport name
    lat: number;                 // Latitude
    lon: number;                 // Longitude
  };
  status: "scheduled" | "cancelled" | "completed";
  weatherStatus?: "safe" | "caution" | "unsafe";
  lastWeatherCheck?: Timestamp;
  lastModified?: Timestamp;
  createdAt: Timestamp;
  cancelledBy?: string;          // User ID who cancelled
  cancelledAt?: Timestamp;
}
```

### AI Reschedules Subcollection

**Path:** `bookings/{bookingId}/aiReschedules`

```typescript
{
  id: string;
  explanation: string;            // AI explanation
  suggestions: Array<{
    date: string;                 // Suggested date (YYYY-MM-DD)
    time: string;                 // Suggested time (e.g., "10:00 AM")
    reason: string;               // AI reasoning
  }>;                             // Always exactly 3 suggestions
  trainingLevel?: "student" | "private" | "instrument";
  violations?: string[];          // Weather violations
  createdAt: Timestamp;
}
```

### Notification Queue Collection

**Document ID:** `{bookingId}-{type}-{channel}`

```typescript
{
  bookingId: string;
  studentId: string;
  type: "weather_alert" | "reschedule_confirmation" | "weather_improved";
  channel: "email";
  status: "pending" | "processing" | "sent" | "failed";
  attempts: number;               // Retry count (max 3)
  scheduledAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  payload: {
    // Notification data
  };
  lastError?: string;
}
```

For complete schema documentation, see [docs/database-schema.md](./docs/database-schema.md).

---

## 🧪 Testing

### Manual Testing

```bash
# Test WeatherAPI integration
npm run weather:test

# Test weather safety logic
npm run weather:logic:test
```

### Testing Checklist

- ✅ Weather API returns valid data
- ✅ Safety logic flags unsafe flights correctly
- ✅ AI generates 3 reschedule suggestions
- ✅ Notifications sent successfully (email + in-app)
- ✅ Dashboard displays real-time updates
- ✅ Firestore transactions handle concurrent edits
- ✅ Cloud Scheduler runs hourly
- ✅ User authentication works (signup/login)
- ✅ Role-based access control works
- ✅ Manual weather check triggers correctly

### Testing Firebase Functions Locally

```bash
cd functions
npm run serve

# Functions will be available at:
# http://localhost:5001/clearskies-app-b852c/us-central1/checkWeatherStatus
```

---

## 🔧 Troubleshooting

### Build Errors

**Error: Cannot find module 'firebase-functions'**
- **Solution:** The `functions/` directory is excluded from Next.js compilation. This is correct. Firebase Functions are deployed separately.

**Error: Type error in functions directory**
- **Solution:** Make sure `functions/` is in the `exclude` array in `tsconfig.json`. The functions directory has its own `tsconfig.json`.

### Firebase Errors

**Error: Functions config not found**
- **Solution:** Run `firebase functions:config:set` to set your API keys (see Setup section 4.6).

**Error: Permission denied**
- **Solution:** Make sure you're logged in with `firebase login` and have the correct project selected.

**Error: Firestore rules deployment failed**
- **Solution:** Check `firestore.rules` syntax. Rules must be valid.

### Deployment Errors

**Error: Build failed on Vercel**
- **Solution:** 
  - Make sure all `NEXT_PUBLIC_*` environment variables are set in Vercel
  - Check that `functions/` is excluded in `tsconfig.json`
  - Verify build logs for specific errors

**Error: Functions deployment failed**
- **Solution:**
  - Check that all required config variables are set
  - Verify TypeScript compilation: `cd functions && npm run build`
  - Check function logs: `firebase functions:log`

### Runtime Errors

**Email notifications not sending**
- **Solution:** SMTP configuration is optional. If not configured, emails will be queued but not sent. Configure SMTP (see Setup section 4.7) or use in-app notifications only.

**Weather checks not running**
- **Solution:** 
  - Verify Cloud Scheduler is set up (see Deployment section)
  - Check function logs: `firebase functions:log`
  - Verify `checkWeatherStatus` function is deployed

**Authentication not working**
- **Solution:**
  - Verify Firebase Auth is enabled in Firebase Console
  - Check that Email/Password provider is enabled
  - Verify environment variables are set correctly

---

## 📖 Documentation

- **[PRD](./docs/clearskies-prd.md)** — Product Requirements Document
- **[Final PRD](./docs/clearskies-final-prd.md)** — Final Product Requirements
- **[Design Spec](./docs/clearskies-design-spec.md)** — UI/UX specifications
- **[Task List](./docs/clearskies-task-list.md)** — Implementation roadmap
- **[Refactor Tasks](./docs/clearskies-refactor-tasks.md)** — Refactoring tasks
- **[Database Schema](./docs/database-schema.md)** — Complete database documentation
- **[Environment Config](./docs/environment-config.md)** — Environment variable guide
- **[AI Log](./docs/ai-log.md)** — Development progress tracking

---

## 🎨 Design System

### Colors

- **Primary:** #2C82C9 (Sky Blue)
- **Secondary:** #56CCF2 (Cyan)
- **Success:** #2ECC71 (Green)
- **Warning:** #F5B041 (Orange)
- **Danger:** #E74C3C (Red)
- **Background (Dark):** #0E1B27
- **Background (Light):** #F7FAFC

### Typography

- **Font:** Inter (Google Fonts)
- **Weights:** 400 (body), 500 (labels), 600-700 (headings)

### Icons

- **Library:** [Lucide React](https://lucide.dev/)
- **Sizes:** 16px (inline), 24px (default), 32px (large), 48px (hero)

---

## 🔐 Security

- **Firestore Rules:** Students can only access their own data
- **Authentication:** Firebase Auth with email/password
- **API Keys:** Stored securely in Firebase Functions config
- **Environment Variables:** Never commit `.env.local` to git
- **CORS:** Configured for Firebase domains only

---

## 🤝 Contributing

This project is part of a controlled implementation plan. See the [Task List](./docs/clearskies-task-list.md) for PR-by-PR implementation steps.

---

## 📄 License

MIT License — See LICENSE file for details

---

## 👤 Author

**Yahav Corcos**  
**Project:** ClearSkies — AI Flight Rescheduler  
**Version:** 1.0  
**Date:** November 2025

---

## 🙏 Acknowledgments

- **WeatherAPI.com** for real-time weather data
- **OpenAI** for AI-powered rescheduling
- **Firebase** for backend infrastructure
- **Vercel** for seamless deployment
- **Lucide** for beautiful iconography

---

**ClearSkies © 2025** — _Making flight training safer, one weather check at a time._
