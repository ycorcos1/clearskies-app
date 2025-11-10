"use client";

import type { KeyboardEvent } from "react";
import {
  Calendar,
  Clock,
  Cloud,
  Eye,
  Navigation,
  Plane,
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

interface UpcomingFlightsProps {
  bookings: FlightBooking[];
  loading?: boolean;
  error?: string;
  selectedId?: string;
  onSelect?: (booking: FlightBooking) => void;
  onCancel?: (booking: FlightBooking) => void;
  role?: "student" | "instructor";
}

const SkeletonRow = () => (
  <div className="animate-pulse rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
    <div className="flex items-center justify-between">
      <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <div className="h-4 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-4 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="h-4 rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  </div>
);

export const UpcomingFlights = ({
  bookings,
  loading,
  error,
  selectedId,
  onSelect,
  onCancel,
  role = "student",
}: UpcomingFlightsProps) => {
  const isInstructor = role === "instructor";
  const isStudent = role === "student";

  if (error) {
    return (
      <EmptyState
        icon={<Plane className="h-10 w-10" />}
        title="Unable to load flights"
        description="We ran into an issue fetching your upcoming flights. Please refresh and try again."
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <EmptyState
        icon={<Plane className="h-10 w-10" />}
        title="No flights scheduled"
        description="✈️ No flights scheduled. Book your first flight!"
      />
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => {
        const isActive = booking.id === selectedId;
        const handleSelect = () => onSelect?.(booking);
        const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleSelect();
          }
        };

        return (
          <div
            key={booking.id}
            role="button"
            tabIndex={0}
            onClick={handleSelect}
            onKeyDown={handleKeyDown}
            aria-pressed={isActive}
            className={`w-full rounded-xl border bg-white p-4 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:bg-slate-900/60 ${
              isActive
                ? "border-sky-300 shadow-md dark:border-sky-500/70"
                : "border-slate-100 hover:border-sky-200 dark:border-slate-800 dark:hover:border-sky-500/40"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {booking.studentName}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {booking.departureLocation?.name ?? "Location TBD"}
                </p>
              </div>
              <StatusBadge status={booking.weatherStatus} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Calendar className="h-4 w-4 shrink-0 text-sky-500" />
                {formatDateLabel(booking.scheduledDate)}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Clock className="h-4 w-4 shrink-0 text-sky-500" />
                {formatTimeLabel(booking.scheduledTime)}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Navigation className="h-4 w-4 shrink-0 text-sky-500" />
                {booking.departureLocation?.name ?? "TBD"}
              </div>
            </div>
            {booking.demoWeather && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Weather Conditions
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <Eye className="h-4 w-4 shrink-0 text-sky-500" />
                    <span className="font-medium">Visibility:</span>
                    <span>
                      {booking.demoWeather.visibilityMiles.toFixed(1)} mi
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <Wind className="h-4 w-4 shrink-0 text-sky-500" />
                    <span className="font-medium">Wind:</span>
                    <span>
                      {booking.demoWeather.windKts.toFixed(0)} kt
                      {booking.demoWeather.gustKts > booking.demoWeather.windKts
                        ? ` (gusts ${booking.demoWeather.gustKts.toFixed(
                            0
                          )} kt)`
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <Cloud className="h-4 w-4 shrink-0 text-sky-500" />
                    <span className="font-medium">Clouds:</span>
                    <span>{booking.demoWeather.cloudPercent.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <span className="font-medium">Condition:</span>
                    <span className="capitalize">
                      {booking.demoWeather.conditionText}
                    </span>
                  </div>
                </div>
                {(booking.demoWeather.hazards.hasThunderstorm ||
                  booking.demoWeather.hazards.hasFog ||
                  booking.demoWeather.hazards.hasPrecipitation ||
                  booking.demoWeather.hazards.icingRisk) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {booking.demoWeather.hazards.hasThunderstorm && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-200">
                        Thunderstorms
                      </span>
                    )}
                    {booking.demoWeather.hazards.hasFog && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                        Fog
                      </span>
                    )}
                    {booking.demoWeather.hazards.hasPrecipitation && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                        Precipitation
                      </span>
                    )}
                    {booking.demoWeather.hazards.icingRisk && (
                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
                        Icing Risk
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="mt-4 border-t border-dashed border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Last weather check:{" "}
              {formatTimestampLabel(booking.lastWeatherCheck)}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              {isStudent ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleSelect();
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-200 px-4 py-2 text-sm font-semibold text-sky-600 transition hover:border-sky-300 hover:bg-sky-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-sky-500/40 dark:text-sky-200 dark:hover:bg-sky-500/20"
                >
                  View options
                </button>
              ) : null}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onCancel?.(booking);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/40 dark:text-rose-200 dark:hover:bg-rose-500/20"
                disabled={!onCancel}
              >
                Cancel flight
              </button>
            </div>
            {isInstructor ? (
              <p className="mt-2 text-right text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Instructor view
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default UpcomingFlights;
