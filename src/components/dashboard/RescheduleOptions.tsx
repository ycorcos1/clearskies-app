"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Loader2,
  RefreshCcw,
} from "lucide-react";

import type { FlightBooking, TrainingLevel } from "../../data/types";
import { showErrorToast, showRescheduleToast } from "../../lib/toast";
import {
  formatDateLabel,
  formatTimeLabel,
  formatTrainingLevelLabel,
} from "../../utils/format";
import { db } from "../../lib/firebaseConfig";
import { useAiReschedules } from "../../hooks/useAiReschedules";
import { confirmReschedule } from "../../lib/confirmReschedule";
import EmptyState from "./EmptyState";

interface RescheduleOptionsProps {
  booking?: FlightBooking | null;
  onRescheduleSuccess?: () => void;
  role?: "student" | "instructor";
}

export const RescheduleOptions = ({
  booking,
  onRescheduleSuccess,
  role = "student",
}: RescheduleOptionsProps) => {
  const bookingId = booking?.id;
  const studentId = booking?.studentId;
  const defaultTrainingLevel: TrainingLevel = "student";
  const [trainingLevel, setTrainingLevel] =
    useState<TrainingLevel>(defaultTrainingLevel);
  const [trainingLevelLoading, setTrainingLevelLoading] = useState(false);
  const [trainingLevelError, setTrainingLevelError] = useState<
    string | undefined
  >();
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);

  const {
    latest,
    history,
    loading: entriesLoading,
    generating,
    error: aiError,
    generate,
  } = useAiReschedules(bookingId);

  const isInstructor = role === "instructor";

  useEffect(() => {
    setTrainingLevel(defaultTrainingLevel);
    setTrainingLevelError(undefined);
    setTrainingLevelLoading(false);

    if (!booking) {
      return;
    }

    if (booking.trainingLevel) {
      setTrainingLevel(booking.trainingLevel);
      return;
    }

    if (!booking.studentId) {
      setTrainingLevelLoading(false);
      return;
    }

    let isMounted = true;
    setTrainingLevelLoading(true);

    const loadTrainingLevel = async () => {
      try {
        const studentRef = doc(db, "students", booking.studentId!);
        const snapshot = await getDoc(studentRef);
        if (!snapshot.exists()) {
          throw new Error("student document missing");
        }

        const data = snapshot.data() as { trainingLevel?: TrainingLevel };
        const resolved = data.trainingLevel ?? defaultTrainingLevel;
        if (isMounted) {
          setTrainingLevel(resolved);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setTrainingLevel(defaultTrainingLevel);
        setTrainingLevelError(
          error instanceof Error
            ? error.message
            : "Unable to load training level."
        );
      } finally {
        if (isMounted) {
          setTrainingLevelLoading(false);
        }
      }
    };

    void loadTrainingLevel();

    return () => {
      isMounted = false;
    };
  }, [booking]);

  useEffect(() => {
    setActiveSuggestion(null);
  }, [bookingId]);

  const statusSummary = useMemo(() => {
    if (!booking) {
      return "";
    }

    const statusLabel =
      booking.weatherStatus === "unsafe"
        ? "unsafe"
        : booking.weatherStatus === "caution"
        ? "borderline"
        : "unknown";

    return `Weather status flagged as ${statusLabel} for ${formatTrainingLevelLabel(
      trainingLevel
    )}.`;
  }, [booking, trainingLevel]);

  const canReschedule = useMemo(() => {
    if (!booking) {
      return false;
    }
    // Only allow rescheduling for caution or unsafe flights
    return (
      booking.weatherStatus === "caution" || booking.weatherStatus === "unsafe"
    );
  }, [booking]);

  const canStudentReschedule = canReschedule && !isInstructor;

  const handleGenerateSuggestions = async () => {
    if (!booking || !canStudentReschedule) {
      return;
    }

    try {
      await generate({
        bookingId: booking.id,
        studentId: studentId,
        studentName: booking.studentName,
        trainingLevel,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        locationName: booking.departureLocation?.name ?? "Unknown location",
        violations: statusSummary ? [statusSummary] : [],
      });
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : "Failed to generate AI suggestions. Please try again shortly."
      );
    }
  };

  const handleConfirm = async (date: string, time: string) => {
    if (!booking || !canStudentReschedule) {
      return;
    }

    setActiveSuggestion(`${date}-${time}`);
    try {
      // Get AI explanation from latest suggestion if available
      const aiExplanation = latest?.explanation;

      await confirmReschedule({
        bookingId: booking.id,
        newDate: date,
        newTime: time,
        aiExplanation,
      });

      showRescheduleToast({ date, time });
      onRescheduleSuccess?.();
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : "Unable to confirm reschedule. Please try again."
      );
    } finally {
      setActiveSuggestion(null);
    }
  };

  if (!booking) {
    return (
      <EmptyState
        icon={<Calendar className="h-10 w-10 text-sky-500" />}
        title="Select a flight to review options"
        description="Pick an alert to see AI-powered reschedule suggestions tailored for that student."
      />
    );
  }

  const hasSuggestions = latest?.suggestions?.length;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Selected Flight
            </p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {booking.studentName}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {formatDateLabel(booking.scheduledDate)} at{" "}
              {formatTimeLabel(booking.scheduledTime)} •{" "}
              {booking.departureLocation?.name ?? "Location TBD"}
            </p>
          </div>
          <div className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-600 dark:bg-sky-500/10 dark:text-sky-200">
            {formatTrainingLevelLabel(trainingLevel)}
          </div>
        </header>
        {trainingLevelError ? (
          <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
            We couldn&apos;t confirm this student&apos;s training level. Using
            the default limits for Student Pilot.
          </p>
        ) : null}
        {isInstructor ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
            Read-only view for instructors. Students generate and confirm
            reschedules.
          </div>
        ) : null}
        <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
          {statusSummary}
        </div>
        {!canReschedule ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
            <p className="font-medium">✓ Weather conditions are safe</p>
            <p className="mt-1 text-xs">
              This flight is marked as safe and does not require rescheduling.
              Only flights with caution or unsafe weather status can be
              rescheduled.
            </p>
          </div>
        ) : isInstructor ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            Students generate AI suggestions for their flights. Review existing
            options below.
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerateSuggestions}
              disabled={generating || trainingLevelLoading}
              className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-sky-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:bg-sky-300 dark:hover:bg-sky-400/80"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Generate AI suggestions
            </button>
            {aiError ? (
              <span className="text-xs text-red-500 dark:text-red-300">
                {aiError}
              </span>
            ) : null}
          </div>
        )}
      </section>

      {entriesLoading ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Fetching AI suggestions…
            </p>
          </div>
        </div>
      ) : hasSuggestions && canReschedule ? (
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              AI Explanation
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {latest?.explanation}
            </p>
          </div>
          <div className="grid gap-4">
            {latest?.suggestions.map((suggestion) => {
              const suggestionKey = `${suggestion.date}-${suggestion.time}`;
              const pending = activeSuggestion === suggestionKey;

              return (
                <div
                  key={suggestionKey}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                        {formatDateLabel(suggestion.date)} at{" "}
                        {formatTimeLabel(suggestion.time)}
                      </h4>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {suggestion.reason}
                      </p>
                    </div>
                    {!isInstructor ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleConfirm(suggestion.date, suggestion.time)
                        }
                        disabled={pending || !canReschedule}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:hover:bg-emerald-400/80"
                      >
                        {pending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Calendar className="h-4 w-4" />
                        )}
                        Confirm reschedule
                      </button>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        Read-only
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {history.length > 1 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Showing the latest AI recommendation. View earlier suggestions in
              the activity log soon.
            </div>
          ) : null}
        </section>
      ) : canReschedule ? (
        isInstructor ? (
          <EmptyState
            icon={<AlertTriangle className="h-10 w-10 text-amber-500" />}
            title="Awaiting student action"
            description="Students generate AI suggestions and confirm scheduling changes. Monitor updates here."
          />
        ) : (
          <EmptyState
            icon={<AlertTriangle className="h-10 w-10 text-amber-500" />}
            title="No AI suggestions yet"
            description="Generate AI suggestions to receive safer reschedule windows tailored to this student."
            action={
              <button
                type="button"
                onClick={handleGenerateSuggestions}
                disabled={generating || trainingLevelLoading}
                className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-sky-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:bg-sky-300 dark:hover:bg-sky-400/80"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Generate AI suggestions
              </button>
            }
          />
        )
      ) : null}
    </div>
  );
};

export default RescheduleOptions;
