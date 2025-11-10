"use client";

import type { FlightBooking } from "../../data/types";
import { formatDateLabel, formatTimeLabel } from "../../utils/format";

interface CancelBookingModalProps {
  open: boolean;
  booking: FlightBooking | null;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  role?: "student" | "instructor";
}

const CancelBookingModal = ({
  open,
  booking,
  onClose,
  onConfirm,
  loading = false,
  role = "student",
}: CancelBookingModalProps) => {
  if (!open || !booking) {
    return null;
  }

  const { studentName, scheduledDate, scheduledTime, departureLocation } =
    booking;

  const locationLabel = departureLocation?.name ?? "Location TBD";
  const actorLabel =
    role === "instructor"
      ? "This student will be notified immediately."
      : "Your instructor will be notified automatically.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6 backdrop-blur">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Cancel flight
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Are you sure you want to cancel this scheduled flight? This action
            cannot be undone.
          </p>
        </header>
        <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          <p className="font-semibold text-slate-800 dark:text-slate-100">
            {studentName}
          </p>
          <p className="mt-1">
            {formatDateLabel(scheduledDate)} at {formatTimeLabel(scheduledTime)}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {locationLabel}
          </p>
        </section>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {actorLabel}
        </p>
        <footer className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={onClose}
            disabled={loading}
          >
            Keep flight
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Cancelling…" : "Yes, cancel flight"}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default CancelBookingModal;
