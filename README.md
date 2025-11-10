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
| **Frontend**       | Next.js, React, TypeScript, TailwindCSS |
| **Backend**        | Firebase Functions (TypeScript)         |
| **Database**       | Firebase Firestore (NoSQL)              |
| **AI**             | OpenAI API (GPT-4)                      |
| **Weather API**    | WeatherAPI.com                          |
| **Authentication** | Firebase Auth                           |
| **Scheduler**      | Firebase Cloud Scheduler                |
| **Deployment**     | Vercel (frontend) + Firebase (backend)  |
| **Icons**          | Lucide React                            |

---

## 📋 Features

### Core Functionality

- ✅ **Hourly Weather Monitoring** — Automated checks for all upcoming flights
- ✅ **Smart Safety Logic** — Different thresholds for Student, Private, and Instrument Rated pilots
- ✅ **AI Rescheduling** — OpenAI generates 3 alternative times with explanations
- ✅ **Real-time Notifications** — Email + in-app toasts for weather alerts
- ✅ **Live Dashboard** — Color-coded flight status with real-time Firestore sync
- ✅ **User Settings** — Customize notification preferences and display options

### Safety Thresholds by Training Level

| Training Level       | Visibility | Wind Speed | Ceiling            | Special Conditions         |
| -------------------- | ---------- | ---------- | ------------------ | -------------------------- |
| **Student Pilot**    | > 5 mi     | < 10 kt    | Clear to scattered | No precipitation, no fog   |
| **Private Pilot**    | > 3 mi     | < 20 kt    | > 1000 ft          | No thunderstorms           |
| **Instrument Rated** | > 1 mi     | Flexible   | IMC OK             | No thunderstorms, no icing |

---

## 📁 Project Structure

```
clearskies-app/
├── docs/                       # Project documentation
│   ├── clearskies-prd.md       # Product Requirements Document
│   ├── clearskies-design-spec.md # Design & UI specifications
│   ├── clearskies-task-list.md # PR-by-PR implementation plan
│   └── ai-log.md               # AI-assisted development log
├── src/
│   ├── components/             # React components
│   ├── pages/                  # Next.js pages & API routes
│   │   ├── dashboard.tsx       # Main dashboard
│   │   ├── login.tsx           # Authentication
│   │   ├── settings.tsx        # User settings
│   │   └── api/                # API routes
│   ├── lib/                    # Core libraries
│   │   ├── firebaseConfig.ts   # Firebase initialization
│   │   ├── weatherAPI.ts       # WeatherAPI.com integration
│   │   └── aiRescheduler.ts    # OpenAI integration
│   ├── utils/                  # Utility functions
│   │   ├── weatherLogic.ts     # Safety logic
│   │   └── seedFirestore.ts    # Mock data seeding
│   ├── data/                   # Mock data
│   │   └── mockData.ts         # Students & bookings
│   └── styles/                 # Global styles
├── functions/                  # Firebase Cloud Functions
│   └── src/
│       └── index.ts            # Scheduled weather checks
├── public/                     # Static assets
│   ├── logo.svg                # ClearSkies logo
│   └── favicon.svg             # Favicon
└── .env.local                  # Environment variables (see setup)
```

---

## 🛠️ Setup Instructions

### Prerequisites

- **Node.js** 18+ and npm/yarn
- **Firebase CLI** (`npm install -g firebase-tools`)
- **Git** for version control

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

# API Keys (for reference - Functions use firebase functions:config:set)
WEATHER_API_KEY=your_weatherapi_key
OPENAI_API_KEY=your_openai_key
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
# - Firestore
# - Functions
# - Hosting (optional)
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

# Verify configuration
firebase functions:config:get
```

**Access in Functions Code:**

```typescript
import * as functions from "firebase-functions";

const weatherApiKey = functions.config().weather.api_key;
const openaiApiKey = functions.config().openai.api_key;
```

#### 4.7. Deploy Functions (when ready)

```bash
# Build and deploy functions
firebase deploy --only functions

# Or deploy everything
firebase deploy
```

#### 4.8. Firebase Project Information

- **Project ID:** `clearskies-app-b852c`
- **Project Console:** https://console.firebase.google.com/project/clearskies-app-b852c/overview

**Firestore Collections:**

- `students` - Student user data
- `bookings` - Flight booking records
- `errorLogs` - Error logging (managed by Cloud Functions)

**Security Rules:**

- Students can only read/write their own data
- Students can only access their own bookings
- Error logs are only accessible by Cloud Functions (admin SDK)

### 5. Seed Mock Data (Development)

```bash
npm run seed
# This runs the seedFirestore script to populate test data
```

### 6. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 🚢 Deployment

### Frontend (Vercel)

1. Push code to GitHub
2. Connect repository to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard (same as `.env.local`)
4. Deploy automatically on push to `main`

### Backend (Firebase)

```bash
# Deploy all Firebase services
firebase deploy

# Or deploy individually
firebase deploy --only functions
firebase deploy --only firestore
```

### Cloud Scheduler Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Functions** → **Logs**
3. Enable **Cloud Scheduler** (requires Blaze plan)
4. Schedule `checkWeatherStatus` function to run every hour

---

## 📊 Database Schema

### Students Collection

```typescript
{
  id: string;
  name: string;
  email: string;
  phone: string;
  trainingLevel: "student" | "private" | "instrument";
  settings: {
    notifications: {
      emailWeatherAlerts: boolean;
      emailReschedule: boolean;
      inAppToasts: boolean;
    }
    theme: "light" | "dark";
  }
  createdAt: Timestamp;
}
```

### FlightBookings Collection

```typescript
{
  id: string;
  studentId: string;
  studentName: string;
  scheduledDate: string; // "2025-11-15"
  scheduledTime: string; // "09:00 AM"
  departureLocation: {
    name: string; // "Palo Alto Airport (PAO)"
    lat: number;
    lon: number;
  };
  status: "scheduled" | "cancelled" | "completed";
  weatherStatus?: "safe" | "caution" | "unsafe";
  lastWeatherCheck?: Timestamp;
  createdAt: Timestamp;
}
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test weatherLogic
npm test aiRescheduler

# Run with coverage
npm test -- --coverage
```

### Testing Checklist

- ✅ Weather API returns valid data
- ✅ Safety logic flags unsafe flights correctly
- ✅ AI generates 3 reschedule suggestions
- ✅ Notifications sent successfully
- ✅ Dashboard displays real-time updates
- ✅ Firestore transactions handle concurrent edits
- ✅ Cloud Scheduler runs hourly

---

## 📖 Documentation

- **[PRD](./docs/clearskies-prd.md)** — Complete product requirements
- **[Design Spec](./docs/clearskies-design-spec.md)** — UI/UX specifications
- **[Task List](./docs/clearskies-task-list.md)** — Implementation roadmap
- **[AI Log](./docs/ai-log.md)** — Development progress tracking

---

## 🎨 Design System

### Colors

- **Primary:** #2C82C9 (Sky Blue)
- **Secondary:** #56CCF2 (Cyan)
- **Success:** #2ECC71 (Green)
- **Warning:** #F5B041 (Orange)
- **Danger:** #E74C3C (Red)

### Typography

- **Font:** Inter (Google Fonts)
- **Weights:** 400 (body), 500 (labels), 600-700 (headings)

### Icons

- **Library:** [Lucide React](https://lucide.dev/)
- **Sizes:** 16px (inline), 24px (default), 32px (large), 48px (hero)

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
