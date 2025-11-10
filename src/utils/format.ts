import type { Timestamp } from "firebase/firestore";
import type { FlightBooking, TrainingLevel } from "../data/types";

const WEEKDAY_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const formatDateLabel = (isoDate?: string): string => {
  if (!isoDate) {
    return "Date TBD";
  }

  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return WEEKDAY_DATE_FORMAT.format(date);
};

export const formatTimeLabel = (time?: string): string => {
  if (!time) {
    return "Time TBD";
  }

  return time;
};

export const formatDateTimeLabel = (date?: string, time?: string): string => {
  if (!date && !time) {
    return "Schedule TBD";
  }

  if (date && time) {
    const normalized = new Date(`${date}T${convertMeridiemTimeTo24Hour(time)}`);
    if (!Number.isNaN(normalized.getTime())) {
      return DATE_TIME_FORMAT.format(normalized);
    }
    return `${date} at ${time}`;
  }

  if (date) {
    return `${formatDateLabel(date)}`;
  }

  return formatTimeLabel(time);
};

export const formatTimestampLabel = (timestamp?: Timestamp | null): string => {
  if (!timestamp) {
    return "—";
  }

  try {
    const date = timestamp.toDate();
    return DATE_TIME_FORMAT.format(date);
  } catch {
    return "—";
  }
};

export const formatTrainingLevelLabel = (
  trainingLevel?: TrainingLevel
): string => {
  switch (trainingLevel) {
    case "student":
      return "Student Pilot";
    case "private":
      return "Private Pilot";
    case "instrument":
      return "Instrument Rated";
    default:
      return "Pilot";
  }
};

export const formatWeatherStatusLabel = (
  status: FlightBooking["weatherStatus"]
): string => {
  switch (status) {
    case "safe":
      return "Safe";
    case "caution":
      return "Caution";
    case "unsafe":
      return "Unsafe";
    default:
      return "Unknown";
  }
};

export const convertMeridiemTimeTo24Hour = (time: string): string => {
  const trimmed = time.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return trimmed;
  }

  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3].toUpperCase();

  if (meridiem === "AM") {
    hours = hours === 12 ? 0 : hours;
  } else if (meridiem === "PM") {
    hours = hours === 12 ? 12 : hours + 12;
  }

  return `${String(hours).padStart(2, "0")}:${minutes}`;
};

export const formatFlightTitle = (booking: FlightBooking): string => {
  const dateLabel = formatDateLabel(booking.scheduledDate);
  const timeLabel = formatTimeLabel(booking.scheduledTime);
  return `${dateLabel} • ${timeLabel}`;
};
