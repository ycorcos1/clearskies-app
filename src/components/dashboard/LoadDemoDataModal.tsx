"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";

import type { Student } from "../../data/types";
import { db } from "../../lib/firebaseConfig";

interface LoadDemoDataModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (instructorId: string, useRealWeather: boolean) => Promise<void>;
  disabled?: boolean;
  useRealWeather?: boolean;
}

interface InstructorOption {
  id: string;
  name: string;
  email?: string | null;
}

const LoadDemoDataModal = ({
  open,
  onClose,
  onConfirm,
  disabled = false,
  useRealWeather = false,
}: LoadDemoDataModalProps) => {
  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;

    const fetchInstructors = async () => {
      setLoading(true);
      setError(null);

      try {
        const instructorsQuery = query(
          collection(db, "students"),
          where("role", "==", "instructor"),
          orderBy("name", "asc")
        );

        const snapshot = await getDocs(instructorsQuery);
        if (!active) {
          return;
        }

        const options: InstructorOption[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Student;
          return {
            id: docSnap.id,
            name: data.name ?? docSnap.id,
            email: data.email ?? undefined,
          };
        });

        setInstructors(options);
        if (options.length > 0) {
          setSelectedInstructorId(options[0].id);
        } else {
          setSelectedInstructorId("");
        }
      } catch (err) {
        console.error("Failed to load instructors", err);
        if (active) {
          setError(
            "Unable to load instructors. Please try again or create an instructor account first."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchInstructors();

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleConfirm = async () => {
    if (!selectedInstructorId) {
      setError("Please select an instructor to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(selectedInstructorId, useRealWeather);
      onClose();
    } catch (err) {
      console.error("Failed to seed demo data", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate demo data. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4 py-6 backdrop-blur">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Load Demo Data
            </h2>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {useRealWeather ? "Live WeatherAPI" : "Scenario Weather"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Choose the instructor who will supervise this student pilot. Demo
            flights will be assigned to both accounts.
          </p>
        </div>

        {loading ? (
          <p className="py-6 text-sm text-slate-500 dark:text-slate-400">
            Fetching instructors…
          </p>
        ) : instructors.length === 0 ? (
          <p className="py-6 text-sm text-slate-500 dark:text-slate-400">
            No instructors found. Create an instructor account first.
          </p>
        ) : (
          <div className="space-y-2">
            <label
              htmlFor="demo-instructor"
              className="text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Instructor
            </label>
            <select
              id="demo-instructor"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              value={selectedInstructorId}
              onChange={(event) => setSelectedInstructorId(event.target.value)}
              disabled={submitting || disabled}
            >
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.name}
                  {instructor.email ? ` (${instructor.email})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {error ? (
          <p className="mt-3 text-sm text-rose-500 dark:text-rose-400">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleConfirm}
            disabled={submitting || disabled || instructors.length === 0}
          >
            {submitting ? "Generating…" : "Generate Demo Flights"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadDemoDataModal;
