import type { Timestamp } from "firebase-admin/firestore";

export type TrainingLevel = "student" | "private" | "instrument";
export type NotificationAudience = "student" | "instructor";

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

export interface DepartureLocation {
  name: string;
  lat: number;
  lon: number;
}

export interface FlightBookingRecord {
  studentId?: string;
  studentName?: string;
  trainingLevel?: TrainingLevel;
  assignedInstructor?: string;
  email?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  departureLocation?: DepartureLocation;
  status?: "scheduled" | "cancelled" | "completed";
  weatherStatus?: "safe" | "caution" | "unsafe" | null;
  demo?: boolean;
  demoWeather?: WeatherSnapshot;
  lastWeatherCheck?: Timestamp;
  lastModified?: Timestamp;
  cancelledBy?: string;
  cancelledAt?: Timestamp;
}

export interface StudentNotificationSettings {
  emailWeatherAlerts?: boolean;
  emailReschedule?: boolean;
  emailWeatherImproved?: boolean;
  inAppToasts?: boolean;
}

export interface StudentSettings {
  notifications?: StudentNotificationSettings;
}

export interface StudentRecord {
  name?: string;
  email?: string;
  role?: "student" | "instructor";
  trainingLevel?: TrainingLevel;
  assignedInstructor?: string;
  settings?: StudentSettings;
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

export type NotificationType =
  | "weather_alert"
  | "reschedule_confirmation"
  | "weather_improved"
  | "cancellation"
  | "generic_error";

export type NotificationChannel = "email";

export interface NotificationEmailContext {
  scheduledDate?: string;
  scheduledTime?: string;
  locationName?: string;
  trainingLevel?: TrainingLevel;
  studentName?: string;
  studentEmail?: string;
  recipientName?: string;
  recipientEmail?: string;
  violations?: string[];
  aiExplanation?: string;
  rescheduleOptions?: AIRescheduleSuggestion[];
  actionUrl?: string;
  audience?: NotificationAudience;
}

export interface NotificationQueueRecord {
  type: NotificationType;
  channel: NotificationChannel;
  bookingId: string;
  studentId: string;
  recipientId: string;
  audience: NotificationAudience;
  status: "pending" | "processing" | "sent" | "failed";
  attempts: number;
  scheduledAt: Timestamp;
  payload: NotificationEmailContext;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastError?: string;
}

export interface NotificationEventRecord {
  type: NotificationType;
  channel: NotificationChannel;
  bookingId: string;
  userId: string;
  status: "sent" | "failed";
  attempt: number;
  messageId?: string;
  errorMessage?: string;
  createdAt: Timestamp;
}

export interface NotificationEvent {
  id?: string;
  userId: string;
  type: "weather_alert" | "reschedule_confirmation" | "cancellation";
  bookingId: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
}
