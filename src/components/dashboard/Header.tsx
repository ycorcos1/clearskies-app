"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Plane, Settings } from "lucide-react";

import type { TrainingLevel } from "../../data/types";
import { formatTrainingLevelLabel } from "../../utils/format";
import NotificationsDropdown from "./NotificationsDropdown";

interface DashboardHeaderProps {
  userId?: string;
  userName?: string;
  userRole?: "student" | "instructor";
  trainingLevel?: TrainingLevel;
  onLogout?: () => void;
  onSelectBooking?: (bookingId: string) => void;
}

const roleLabels: Record<"student" | "instructor", string> = {
  student: "Student Pilot",
  instructor: "Instructor",
};

export const DashboardHeader = ({
  userId,
  userName,
  userRole,
  trainingLevel,
  onLogout,
  onSelectBooking,
}: DashboardHeaderProps) => {
  const pathname = usePathname();
  const isSettingsPage = pathname === "/settings";

  // Show training level label for students, role label for instructors
  const displayLabel =
    userRole === "student" && trainingLevel
      ? formatTrainingLevelLabel(trainingLevel)
      : userRole
      ? roleLabels[userRole]
      : "Ready for departure";

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/60 dark:text-sky-200">
            <Plane className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">
              ClearSkies
            </p>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              Flight Operations Dashboard
            </h1>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {userId ? (
            <NotificationsDropdown
              userId={userId}
              onSelectBooking={onSelectBooking}
            />
          ) : null}
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {userName ?? "Pilot"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {displayLabel}
            </p>
          </div>
          {!isSettingsPage && (
            <Link
              href="/settings"
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Open settings"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Log out"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
