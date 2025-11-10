import type { FieldValue, Timestamp } from "firebase/firestore";

export type TrainingLevel = "student" | "private" | "instrument";

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "student" | "instructor";
  trainingLevel?: TrainingLevel;
  assignedInstructor?: string;
  createdAt: Timestamp;
  settings?: StudentSettings;
}

export interface FlightBooking {
  id: string;
  studentId: string;
  studentName: string;
  trainingLevel?: TrainingLevel;
  assignedInstructor?: string;
  scheduledDate: string;
  scheduledTime: string;
  departureLocation: {
    name: string;
    lat: number;
    lon: number;
  };
  status: "scheduled" | "cancelled" | "completed";
  weatherStatus?: "safe" | "caution" | "unsafe";
  demo?: boolean;
  demoWeather?: WeatherSnapshot;
  lastWeatherCheck?: Timestamp;
  lastModified?: Timestamp;
  cancelledBy?: string;
  cancelledAt?: Timestamp;
  createdAt: Timestamp;
}

export interface ErrorLog {
  id: string;
  type: "weather_api" | "openai_api" | "firestore" | "notification";
  message: string;
  bookingId?: string;
  studentId?: string;
  timestamp: Timestamp;
  retryCount: number;
  resolved: boolean;
}

export interface AIRescheduleSuggestion {
  date: string;
  time: string;
  reason: string;
}

export interface AIRescheduleResponse {
  explanation: string;
  suggestions: AIRescheduleSuggestion[];
}

export interface WeatherHazards {
  hasThunderstorm: boolean;
  hasFog: boolean;
  hasPrecipitation: boolean;
  icingRisk: boolean;
}

export interface WeatherSnapshot {
  visibilityMiles: number;
  windKts: number;
  gustKts: number;
  cloudPercent: number;
  tempC: number;
  conditionText: string;
  hazards: WeatherHazards;
  observedAt: string;
  provider: "weatherapi" | "demo";
}

export interface StudentSettings {
  notifications: {
    emailWeatherAlerts: boolean;
    emailReschedule: boolean;
    emailWeatherImproved: boolean;
    inAppToasts: boolean;
  };
  theme: "light" | "dark";
  updatedAt?: Timestamp | FieldValue;
}

export interface NotificationEvent {
  id: string;
  userId: string;
  type: "weather_alert" | "reschedule_confirmation" | "cancellation";
  bookingId: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
}
