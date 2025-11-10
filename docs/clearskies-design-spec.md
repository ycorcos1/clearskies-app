# ClearSkies — Design Specification

## 1. Brand Identity

**Product Name:** ClearSkies  
**Tagline:** _AI-powered weather intelligence for safer, smarter flight training._  
**Mission:** Enable flight schools to avoid weather-related disruptions through automated weather checks, intelligent rescheduling, and clear communication.  
**Core Values:** Safety • Clarity • Automation • Trust

---

## 2. Visual Design

### Aesthetic

A modern aviation dashboard aesthetic — calm, reliable, professional. Inspired by aviation instruments and premium weather interfaces.

### Color Palette

| Purpose          | Light Mode         | Dark Mode             |
| ---------------- | ------------------ | --------------------- |
| Primary          | #2C82C9 (Sky Blue) | #1B4965 (Navy Blue)   |
| Secondary        | #56CCF2 (Cyan)     | #5BC0EB (Bright Blue) |
| Background       | #F7FAFC            | #0E1B27               |
| Accent / Success | #2ECC71            | #27AE60               |
| Warning          | #F5B041            | #F1C40F               |
| Danger           | #E74C3C            | #C0392B               |
| Text             | #1A1A1A            | #EAEAEA               |

### Typography

- **Primary Font:** Inter (Google Fonts)
- **Weights:**
  - Headings: 600–700
  - Body: 400
  - Data/Labels: 400–500

---

## 3. Logo & Favicon

### Logo Concept

Minimal horizon-circle icon with upward flight-path curve. Clean, sky-tech feel.

### Favicon

Cursor should generate a favicon for `/public/favicon.svg` that matches the logo style.  
Simple version: sky gradient circle with upward arrow.

Add to layout metadata:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
```

---

## 4. Layout Structure

### Global Layout

- Top navigation bar:
  - Logo + "ClearSkies"
  - User avatar/logout (Firebase Auth)
- Main dashboard (3-column responsive layout)
- Footer: `ClearSkies © 2025`

### Responsive Breakpoints (Tailwind)

| Breakpoint  | Min Width              | Layout Behavior                                  |
| ----------- | ---------------------- | ------------------------------------------------ |
| **Mobile**  | < 640px (sm)           | Single column, stacked panels                    |
| **Tablet**  | 640px - 1024px (sm-lg) | Two columns (flights + alerts), reschedule below |
| **Desktop** | ≥ 1024px (lg+)         | Three columns side-by-side                       |

#### Mobile Layout (< 640px)

```
┌─────────────────────┐
│ 🌤️ ClearSkies  👤  │ ← Header (fixed)
├─────────────────────┤
│                     │
│ [Upcoming Flights]  │ ← Full width
│ Panel stacked first │
│                     │
├─────────────────────┤
│                     │
│ [Weather Alerts]    │ ← Full width
│ Panel stacked       │
│ second              │
│                     │
├─────────────────────┤
│                     │
│ [Reschedule]        │ ← Full width
│ Options stacked     │
│ third               │
│                     │
└─────────────────────┘
```

#### Tablet Layout (640px - 1024px)

```
┌───────────────────────────────┐
│ 🌤️ ClearSkies          👤    │ ← Header
├───────────────────────────────┤
│ [Upcoming]   │ [Alerts]       │ ← Two columns
│ Flights      │ Panel          │
│ Panel        │                │
│              │                │
├───────────────────────────────┤
│ [Reschedule Options]          │ ← Full width below
│                               │
└───────────────────────────────┘
```

#### Desktop Layout (≥ 1024px)

```
┌─────────────────────────────────────────┐
│ 🌤️ ClearSkies                     👤   │ ← Header
├─────────────────────────────────────────┤
│ [Upcoming] │ [Alerts]  │ [Reschedule]   │ ← Three columns
│ Flights    │ Panel     │ Options        │
│ Panel      │           │                │
│            │           │                │
└─────────────────────────────────────────┘
```

#### Tailwind Grid Implementation

```tsx
// Dashboard container
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
  {/* Left Panel */}
  <div className="sm:col-span-1">{/* Upcoming Flights */}</div>

  {/* Center Panel */}
  <div className="sm:col-span-1 lg:col-span-1">{/* Alerts */}</div>

  {/* Right Panel */}
  <div className="sm:col-span-2 lg:col-span-1">{/* Reschedule Options */}</div>
</div>
```

### Dashboard Sections

#### Left: Upcoming Flights

- List of scheduled bookings
- Status colors:
  - ✅ Green — Safe
  - ⚠️ Yellow — Watch
  - ⛔ Red — At Risk

#### Center: Active Alerts

Card format includes:

- Flight info
- Weather snapshot (icon + summary)
- Risk reason text
- Buttons: **Confirm** / **Dismiss**

AI-generated notification content appears here.

#### Right: Suggested Slots

- Three reschedule options
- One-click confirm button
- Toast confirmation

### Additional Pages

- Login screen with aviation background gradient
- Settings page (basic preferences)

---

## 5. UX / Interaction Guidelines

### Micro-interactions

- Subtle fade/slide transitions
- Hover elevation and button emphasis
- Toasts for confirming and errors

### Loading / Empty States

- ClearSkies animation or spinner
- Message: **All clear — no weather risks detected.**

### Error Handling

- Toast + inline alert when weather/AI call fails
- Example: _“Weather data unavailable — try again shortly.”_

---

## 6. Iconography

### Icon Library: Lucide React

**Decision:** Use **Lucide React** exclusively for all icons.  
**Rationale:** Consistent stroke width, tree-shakeable, excellent React support.

**Installation:**

```bash
npm install lucide-react
```

**Usage:**

```tsx
import {
  Sun,
  CloudRain,
  CloudFog,
  AlertTriangle,
  Calendar,
  CheckCircle,
} from "lucide-react";
```

### Icon Mapping

| Purpose               | Lucide Component | Usage                                |
| --------------------- | ---------------- | ------------------------------------ |
| **Safe Weather**      | `Sun`            | Booking status indicator             |
| **Rainy Weather**     | `CloudRain`      | Weather alert icons                  |
| **Foggy Weather**     | `CloudFog`       | Weather alert icons                  |
| **Warning/Alert**     | `AlertTriangle`  | Alert cards, caution status          |
| **Calendar/Schedule** | `Calendar`       | Booking dates, reschedule            |
| **Success/Confirmed** | `CheckCircle`    | Successful actions                   |
| **Error/Unsafe**      | `XCircle`        | Unsafe status, errors                |
| **Wind**              | `Wind`           | Wind conditions                      |
| **Eye**               | `Eye`            | Visibility information               |
| **Navigation**        | `Navigation`     | Flight/location                      |
| **Clock**             | `Clock`          | Time display                         |
| **User**              | `User`           | User profile                         |
| **Settings**          | `Settings`       | Settings page                        |
| **LogOut**            | `LogOut`         | Logout button                        |
| **Info**              | `Info`           | Information tooltips                 |
| **Loader**            | `Loader2`        | Loading states (with spin animation) |
| **Plane**             | `Plane`          | Flight/aviation context              |
| **Bell**              | `Bell`           | Notifications                        |

### Icon Sizing Standards

- **Small (16px):** Inline with text, badges
- **Medium (24px):** Default dashboard icons
- **Large (32px):** Empty states, feature highlights
- **Extra Large (48px):** Hero sections, loading screens

### Color Usage

```tsx
// Safe status
<CheckCircle className="text-green-500" size={24} />

// Warning status
<AlertTriangle className="text-yellow-500" size={24} />

// Danger status
<XCircle className="text-red-500" size={24} />

// Info/Neutral
<Info className="text-blue-500" size={24} />
```

---

## 7. Accessibility

- WCAG AA contrast
- Descriptive `aria-label`s
- Keyboard navigation support

---

## 8. Asset Structure

```
/public
  favicon.svg
  /images
    logo.svg
    login-bg.jpg
```

---

## 9. Footer

Centered footer text:  
**ClearSkies © 2025**

---

## 10. Notification Templates

### In-App Toast Notifications

#### Weather Alert Toast

```tsx
{
  title: "🌧️ Weather Alert",
  message: "Your {date} flight has been flagged due to unsafe conditions.",
  type: "warning",
  duration: 10000, // 10 seconds
  actions: [
    { label: "View Alert", onClick: navigateToDashboard },
    { label: "Dismiss", onClick: dismissToast }
  ]
}
```

#### Reschedule Confirmation Toast

```tsx
{
  title: "✅ Flight Rescheduled",
  message: "Your flight has been moved to {newDate} at {newTime}.",
  type: "success",
  duration: 5000
}
```

#### Error Toast

```tsx
{
  title: "⚠️ Weather Data Unavailable",
  message: "Unable to fetch weather updates. Please try again shortly.",
  type: "error",
  duration: 7000,
  actions: [
    { label: "Retry", onClick: retryWeatherCheck }
  ]
}
```

#### Booking Cancelled Toast

```tsx
{
  title: "📅 Booking Cancelled",
  message: "Your {date} flight has been cancelled due to weather.",
  type: "info",
  duration: 8000
}
```

### Email Notification Templates

#### Weather Alert Email

```
Subject: ⚠️ Weather Alert - Flight on {date} Requires Attention

Hi {studentName},

Your scheduled flight on {date} at {time} from {location} has been flagged due to unsafe weather conditions.

Current Conditions:
{violations}

AI Recommendation:
{aiExplanation}

We've identified three alternative times with better weather conditions:

1. {option1Date} at {option1Time}
   → {option1Reason}

2. {option2Date} at {option2Time}
   → {option2Reason}

3. {option3Date} at {option3Time}
   → {option3Reason}

View your options and confirm a new time:
[View Reschedule Options →]

Stay safe,
The ClearSkies Team

────────────────────────────────
ClearSkies © 2025
AI-powered weather intelligence for safer flight training
```

#### Reschedule Confirmation Email

```
Subject: ✅ Flight Rescheduled - Confirmed for {newDate}

Hi {studentName},

Your flight has been successfully rescheduled!

Original Flight:
❌ {oldDate} at {oldTime}

New Flight:
✅ {newDate} at {newTime}

Location: {location}
Training Level: {trainingLevel}

Forecast Conditions:
{forecastSummary}

Add to Calendar: [iCal Link] [Google Calendar]

If you need to make changes, visit your dashboard:
[Go to Dashboard →]

See you in the skies,
The ClearSkies Team

────────────────────────────────
ClearSkies © 2025
```

#### Weather Improved Email

```
Subject: ☀️ Good News - Weather Improved for Your Flight

Hi {studentName},

Great news! Weather conditions for your upcoming flight on {date} at {time} have improved.

Current Status: ✅ Safe to Fly

Current Conditions:
• Visibility: {visibility} miles
• Wind: {windSpeed} knots
• Conditions: {conditions}

Your flight is confirmed and ready to proceed. No action needed.

[View Dashboard →]

Safe flying,
The ClearSkies Team

────────────────────────────────
ClearSkies © 2025
```

### SMS Notification Templates (Optional Future Feature)

#### Weather Alert SMS

```
ClearSkies: Your {date} flight at {time} has been flagged due to weather. View reschedule options: {shortLink}
```

#### Reschedule Confirmation SMS

```
ClearSkies: Flight rescheduled to {newDate} at {newTime}. Confirmed! View details: {shortLink}
```

### Notification Styling Guidelines

#### Toast Position

- **Desktop:** Top-right corner, 24px margin
- **Mobile:** Top center, full width with 16px side margins

#### Toast Structure

```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-md">
  <div className="flex items-start gap-3">
    <Icon className="w-6 h-6 flex-shrink-0" />
    <div className="flex-1">
      <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{message}</p>
      {actions && (
        <div className="flex gap-2 mt-3">
          {actions.map((action) => (
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
    <button className="text-gray-400 hover:text-gray-600">
      <X size={16} />
    </button>
  </div>
</div>
```

#### Email Styling

- **Width:** Max 600px (responsive)
- **Font:** System font stack (Arial, sans-serif)
- **Colors:** Match brand palette
- **Buttons:** Primary blue (#2C82C9), rounded, 48px height
- **Link color:** #2C82C9 with underline on hover

---

## Summary

This spec defines a premium, aviation‑grade UI with clarity, safety, and automation at its core. Cursor will use this to generate a professional, production‑ready interface with:

- Dashboard structure
- Consistent palette & icons
- Favicon + branding assets
- Animations, toasts, and UX polish

**Design goals:** Clean • Trustworthy • Minimal • Aviation‑Focused
