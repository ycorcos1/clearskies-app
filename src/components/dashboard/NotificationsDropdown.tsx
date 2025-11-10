"use client";

import { useState } from "react";
import { Bell, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import clsx from "clsx";

import { useNotifications } from "../../hooks/useNotifications";

interface NotificationsDropdownProps {
  userId?: string;
  onSelectBooking?: (bookingId: string) => void;
}

const typeIconMap: Record<
  "weather_alert" | "reschedule_confirmation" | "cancellation",
  JSX.Element
> = {
  weather_alert: (
    <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
  ),
  reschedule_confirmation: (
    <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
  ),
  cancellation: (
    <XCircle className="h-4 w-4 text-rose-500" aria-hidden="true" />
  ),
};

const formatRelativeTime = (date?: Date): string => {
  if (!date) {
    return "Just now";
  }

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const times = [
    { unit: "day", value: 86400 },
    { unit: "hour", value: 3600 },
    { unit: "minute", value: 60 },
  ] as const;

  for (const { unit, value } of times) {
    const diff = Math.round(diffSec / value);
    if (Math.abs(diff) >= 1) {
      return rtf.format(diff, unit);
    }
  }

  return rtf.format(Math.round(diffSec), "second");
};

const NotificationsDropdown = ({
  userId,
  onSelectBooking,
}: NotificationsDropdownProps) => {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications(userId);

  const handleToggle = () => {
    if (!userId) {
      return;
    }
    setOpen((prev) => !prev);
  };

  const handleNotificationClick = async (notificationId: string, bookingId: string) => {
    await markAsRead(notificationId);
    if (bookingId && onSelectBooking) {
      onSelectBooking(bookingId);
    }
    setOpen(false);
  };

  const showEmptyState = !loading && notifications.length === 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        disabled={!userId}
        className={clsx(
          "relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
          { "opacity-60": !userId }
        )}
        aria-label="Open notifications"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {Boolean(unreadCount) && (
          <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur transition dark:border-slate-700 dark:bg-slate-900/95">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Notifications
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {unreadCount === 0
                  ? "You're all caught up"
                  : `${unreadCount} unread`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              className="text-xs font-semibold text-sky-500 transition hover:text-sky-400 disabled:opacity-40"
              disabled={unreadCount === 0}
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center px-4 py-6 text-xs text-slate-500 dark:text-slate-400">
                Loading notifications…
              </div>
            ) : showEmptyState ? (
              <div className="flex items-center justify-center px-4 py-6 text-xs text-slate-500 dark:text-slate-400">
                No notifications yet.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map((notification) => {
                  const icon = typeIconMap[notification.type];
                  const createdAt = notification.createdAt as unknown as
                    | { toDate?: () => Date }
                    | undefined;
                  const createdAtDate = createdAt?.toDate?.();

                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() =>
                          handleNotificationClick(
                            notification.id,
                            notification.bookingId
                          )
                        }
                        className={clsx(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-slate-800/80",
                          { "opacity-70": notification.read }
                        )}
                      >
                        <span className="mt-0.5">{icon}</span>
                        <span className="flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {notification.message}
                          </p>
                          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                            {formatRelativeTime(createdAtDate)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default NotificationsDropdown;
