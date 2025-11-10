"use client";

import {
  AlertTriangle,
  ArrowRight,
  CloudFog,
  CloudRain,
  Eye,
  Wind,
} from "lucide-react";
import type { FlightBooking } from "../../data/types";
import {
  formatDateLabel,
  formatTimeLabel,
  formatTimestampLabel,
} from "../../utils/format";
import EmptyState from "./EmptyState";
import StatusBadge from "./StatusBadge";

interface WeatherAlertsProps {
  bookings: FlightBooking[];
  loading?: boolean;
  error?: string;
  onSelect?: (booking: FlightBooking) => void;
  onRefresh?: (booking: FlightBooking) => void | Promise<void>;
  selectedId?: string;
  refreshingId?: string | null;
  role?: "student" | "instructor";
}

const SkeletonAlert = () => (
  <div className="animate-pulse rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
    <div className="flex items-center justify-between">
      <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
    <div className="mt-4 h-16 rounded bg-slate-200 dark:bg-slate-800" />
  </div>
);

const statusToHeadline: Record<string, string> = {
  caution: "Conditions require extra attention.",
  unsafe: "Weather is unsafe for this flight.",
};

export const WeatherAlerts = ({
  bookings,
  loading,
  error,
  onSelect,
  onRefresh,
  selectedId,
  refreshingId,
  role = "student",
}: WeatherAlertsProps) => {
  const isInstructor = role === "instructor";

  if (error) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-10 w-10" />}
        title="Weather alerts unavailable"
        description="We hit turbulence loading your alerts. Refresh to try again."
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonAlert />
        <SkeletonAlert />
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <EmptyState
        icon={<CloudRain className="h-10 w-10" />}
        title="All clear — no weather risks detected."
        description="We’ll keep watching the skies and notify you if conditions change."
      />
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => {
        const status = booking.weatherStatus ?? "caution";
        const isActive = booking.id === selectedId;
        const headline =
          statusToHeadline[status] ?? "Review the forecast before departure.";

        const isRefreshing = refreshingId === booking.id;

        return (
          <article
            key={booking.id}
            className={`rounded-xl border bg-white p-4 shadow-sm transition dark:bg-slate-900/60 ${
              isActive
                ? "border-sky-300 shadow-md dark:border-sky-500/70"
                : "border-amber-200 dark:border-amber-500/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Eye className="h-4 w-4 text-amber-500" />
                  {formatDateLabel(booking.scheduledDate)} at{" "}
                  {formatTimeLabel(booking.scheduledTime)}
                </div>
                <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                  {booking.studentName} •{" "}
                  {booking.departureLocation?.name ?? "Location TBD"}
                </h3>
              </div>
              <StatusBadge status={booking.weatherStatus} />
            </div>
            <div className="mt-3 rounded-lg border border-dashed border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <p className="font-medium">{headline}</p>
              <p className="mt-1 text-xs">
                The hourly weather monitor flagged this flight. Generate AI
                options to review suggested reschedule times and explanations.
              </p>
            </div>
            <div className="mt-3 grid gap-3 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-amber-500" />
                Weather status: {status.toUpperCase()}
              </div>
              <div className="flex items-center gap-2">
                <CloudFog className="h-4 w-4 text-amber-500" />
                Last check: {formatTimestampLabel(booking.lastWeatherCheck)}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-3">
              {onRefresh && (
                <button
                  type="button"
                  onClick={() => onRefresh?.(booking)}
                  disabled={isRefreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:border-amber-400 hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:border-amber-100 disabled:text-amber-300 dark:border-amber-500/40 dark:text-amber-200 dark:hover:bg-amber-500/20 dark:disabled:border-amber-500/10"
                >
                  {isRefreshing ? "Refreshing…" : "Check weather now"}
                </button>
              )}
              <button
                type="button"
                onClick={() => onSelect?.(booking)}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:hover:bg-amber-400/90"
              >
                {isInstructor ? "View details" : "View options"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default WeatherAlerts;
