# ClearSkies Environment Configuration

## Firebase Functions Configuration

### Current Status

✅ **Configured:**

- `weather.api_key` - WeatherAPI.com key (configured)
- `openai.api_key` - OpenAI API key (configured)

⚠️ **Not Configured (Optional):**

- `smtp.host` - SMTP server hostname
- `smtp.port` - SMTP server port (default: 587)
- `smtp.user` - SMTP username/email
- `smtp.pass` - SMTP password/app password
- `smtp.from` - From email address (default: "ClearSkies <no-reply@clearskies.app>")

---

## Configuration Commands

### View Current Configuration

```bash
firebase functions:config:get
```

### Set SMTP Configuration (for email notifications)

```bash
firebase functions:config:set smtp.host="smtp.gmail.com"
firebase functions:config:set smtp.port="587"
firebase functions:config:set smtp.user="your-email@gmail.com"
firebase functions:config:set smtp.pass="your-app-password"
firebase functions:config:set smtp.from="ClearSkies <noreply@yourdomain.com>"
```

**Note**: For Gmail, you'll need to:

1. Enable 2-factor authentication
2. Generate an "App Password" (not your regular password)
3. Use the app password in `smtp.pass`

### Set OpenAI Configuration

```bash
firebase functions:config:set openai.api_key="sk-..."
firebase functions:config:set openai.model="gpt-4o-mini"  # Optional, defaults to gpt-4o-mini
```

### Set Weather API Configuration

```bash
firebase functions:config:set weather.api_key="your-weather-api-key"
```

---

## Frontend Environment Variables

### Required (`.env.local` or Vercel Environment Variables)

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=clearskies-app-b852c
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

---

## Impact of Missing Configuration

### Without SMTP Configuration:

- ✅ Weather monitoring still works
- ✅ AI reschedule generation still works
- ✅ Dashboard still works
- ❌ Email notifications will NOT be sent
- ⚠️ Notifications will be queued but not delivered

The system will log warnings but continue to function. Email notifications are optional for the core demo functionality.

---

## Migration Note

⚠️ **Deprecation Warning**: `functions.config()` API is deprecated and will be removed in March 2026. Consider migrating to environment variables using `.env` files or Google Cloud Secret Manager.

See: https://firebase.google.com/docs/functions/config-env#migrate-to-dotenv

