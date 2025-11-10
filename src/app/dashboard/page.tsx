"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { signOut } from "firebase/auth";

import type { FlightBooking } from "../../data/types";
import DashboardHeader from "../../components/dashboard/Header";
import CancelBookingModal from "../../components/dashboard/CancelBookingModal";
import LoadDemoDataModal from "../../components/dashboard/LoadDemoDataModal";
import RescheduleOptions from "../../components/dashboard/RescheduleOptions";
import UpcomingFlights from "../../components/dashboard/UpcomingFlights";
import WeatherAlerts from "../../components/dashboard/WeatherAlerts";
import { useDashboardBookings } from "../../hooks/useBookings";
import { useAuthUser } from "../../hooks/useAuthUser";
import { auth } from "../../lib/firebaseConfig";
import { cancelBooking } from "../../lib/cancelBooking";
import { showErrorToast } from "../../lib/toast";
import { seedUserDemoData } from "../../utils/seedUserDemoData";
import { refreshWeatherForBooking } from "../../lib/manualWeatherCheck";

const DashboardPage = () => {
  const router = useRouter();
  const { user, loading: authLoading, role, trainingLevel } = useAuthUser();
  const effectiveRole: "student" | "instructor" = role ?? "student";
  const isStudent = effectiveRole === "student";

  const {
    upcoming,
    alerts,
    loading: bookingsLoading,
    error,
  } = useDashboardBookings(user?.uid ?? undefined, effectiveRole);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null
  );
  const [seeding, setSeeding] = useState(false);
  const [useRealWeather, setUseRealWeather] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [seedModalOpen, setSeedModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [bookingPendingCancel, setBookingPendingCancel] =
    useState<FlightBooking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const selectedBooking: FlightBooking | null = useMemo(() => {
    if (!selectedBookingId) {
      return null;
    }

    return (
      alerts.find((booking) => booking.id === selectedBookingId) ??
      upcoming.find((booking) => booking.id === selectedBookingId) ??
      null
    );
  }, [alerts, upcoming, selectedBookingId]);

  useEffect(() => {
    if (!user?.uid || isInitialized || bookingsLoading) {
      return;
    }

    const storageKey = `clearskies_selected_booking_${user.uid}`;
    const persistedId = localStorage.getItem(storageKey);

    if (persistedId) {
      const exists =
        alerts.some((booking) => booking.id === persistedId) ||
        upcoming.some((booking) => booking.id === persistedId);

      if (exists) {
        setSelectedBookingId(persistedId);
      } else {
        localStorage.removeItem(storageKey);
      }
    }

    setIsInitialized(true);
  }, [user?.uid, alerts, upcoming, isInitialized, bookingsLoading]);

  useEffect(() => {
    if (!user?.uid || !isInitialized) {
      return;
    }

    const storageKey = `clearskies_selected_booking_${user.uid}`;

    if (selectedBookingId) {
      localStorage.setItem(storageKey, selectedBookingId);
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [selectedBookingId, user?.uid, isInitialized]);

  useEffect(() => {
    if (!selectedBookingId || !isInitialized) {
      return;
    }

    const exists =
      alerts.some((booking) => booking.id === selectedBookingId) ||
      upcoming.some((booking) => booking.id === selectedBookingId);

    if (!exists) {
      setSelectedBookingId(null);
    }
  }, [selectedBookingId, alerts, upcoming, isInitialized]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  const handleSelectBooking = (booking: FlightBooking) => {
    if (selectedBookingId === booking.id) {
      setSelectedBookingId(null);
    } else {
      setSelectedBookingId(booking.id);
    }
  };

  const handleRequestCancel = (booking: FlightBooking) => {
    setBookingPendingCancel(booking);
    setCancelModalOpen(true);
  };

  const handleSelectBookingFromNotification = (bookingId: string) => {
    if (!bookingId) {
      return;
    }
    setSelectedBookingId(bookingId);
  };

  const handleRescheduleCompleted = () => {
    if (!alerts.length) {
      setSelectedBookingId(null);
      return;
    }

    const remainingAlert = alerts.find(
      (booking) => booking.id !== selectedBookingId
    );
    setSelectedBookingId(remainingAlert?.id ?? alerts[0]?.id ?? null);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  const handleCloseCancelModal = () => {
    if (cancelling) {
      return;
    }
    setCancelModalOpen(false);
    setBookingPendingCancel(null);
  };

  const handleConfirmCancel = async () => {
    if (!bookingPendingCancel) {
      return;
    }

    setCancelling(true);
    try {
      await cancelBooking(bookingPendingCancel.id);
      toast.success("Flight cancelled.");

      if (selectedBookingId === bookingPendingCancel.id) {
        setSelectedBookingId(null);
      }
      setCancelModalOpen(false);
      setBookingPendingCancel(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to cancel this flight. Please try again.";
      showErrorToast(message);
    } finally {
      setCancelling(false);
    }
  };

  const handleSeedDemoData = async (
    instructorId: string,
    seedWithRealWeather: boolean
  ) => {
    if (!user || seeding || !isStudent) {
      return;
    }

    setSeeding(true);
    try {
      const result = await seedUserDemoData({
        userId: user.uid,
        studentName: user.displayName ?? user.email ?? "Demo Pilot",
        email: user.email ?? undefined,
        instructorId,
        useRealWeather: seedWithRealWeather,
      });

      if (result.seeded) {
        toast.success(
          seedWithRealWeather
            ? `Loaded ${result.totalBookings} demo flights using live WeatherAPI snapshots.`
            : `Loaded ${result.totalBookings} demo flights with controlled weather scenarios.`
        );
      } else {
        toast.info(result.reason ?? "Demo data already present.");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load demo data. Please try again.";
      showErrorToast(message);
      throw error;
    } finally {
      setSeeding(false);
    }
  };

  const handleRefreshWeather = async (booking: FlightBooking) => {
    if (refreshingId) {
      return;
    }

    setRefreshingId(booking.id);
    try {
      const result = await refreshWeatherForBooking(booking.id);

      const statusLabel =
        result.status === "unsafe"
          ? "⚠️ Weather is unsafe"
          : result.status === "caution"
          ? "⚠️ Weather requires caution"
          : "✅ Weather is safe";

      toast.info(statusLabel, {
        autoClose: 5000,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to refresh weather.";
      showErrorToast(message);
    } finally {
      setRefreshingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
        <DashboardHeader />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
            Loading dashboard…
          </div>
        </main>
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          ClearSkies © 2025
        </footer>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
          Redirecting to login…
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <DashboardHeader
        userId={user.uid}
        userName={user.displayName ?? user.email ?? undefined}
        userRole={effectiveRole}
        trainingLevel={trainingLevel}
        onLogout={handleLogout}
        onSelectBooking={handleSelectBookingFromNotification}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {isStudent && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50/80 p-4 shadow-sm dark:border-sky-500/40 dark:bg-sky-500/10">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Demo Data
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                {upcoming.length === 0 && alerts.length === 0
                  ? "Generate demo flights to explore ClearSkies."
                  : "Regenerate demo data (will replace existing flights)."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setUseRealWeather(false);
                  setSeedModalOpen(true);
                }}
                disabled={seeding || bookingsLoading}
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:bg-sky-400"
              >
                {seeding && !useRealWeather
                  ? "Loading…"
                  : "Load Demo Data (Fake Weather)"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseRealWeather(true);
                  setSeedModalOpen(true);
                }}
                disabled={seeding || bookingsLoading}
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
              >
                {seeding && useRealWeather
                  ? "Loading…"
                  : "Load Demo Data (Real Weather)"}
              </button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <section className="sm:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Upcoming Flights
              </h2>
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {upcoming.length} scheduled
              </span>
            </div>
            <UpcomingFlights
              bookings={upcoming}
              loading={bookingsLoading}
              error={error}
              onSelect={handleSelectBooking}
              selectedId={selectedBookingId ?? undefined}
              onCancel={handleRequestCancel}
              role={effectiveRole}
            />
          </section>
          <section className="sm:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Weather Alerts
              </h2>
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {alerts.length} active
              </span>
            </div>
            <WeatherAlerts
              bookings={alerts}
              loading={bookingsLoading}
              error={error}
              onSelect={handleSelectBooking}
              onRefresh={handleRefreshWeather}
              selectedId={selectedBookingId ?? undefined}
              refreshingId={refreshingId}
              role={effectiveRole}
            />
          </section>
          <section className="sm:col-span-2 lg:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                AI Reschedule Options
              </h2>
            </div>
            <RescheduleOptions
              booking={selectedBooking}
              onRescheduleSuccess={handleRescheduleCompleted}
              role={effectiveRole}
            />
          </section>
        </div>
      </main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        ClearSkies © 2025
      </footer>
      <LoadDemoDataModal
        open={seedModalOpen && isStudent}
        onClose={() => {
          if (!seeding) {
            setSeedModalOpen(false);
          }
        }}
        disabled={seeding}
        onConfirm={async (instructorId, seedWithRealWeather) => {
          await handleSeedDemoData(instructorId, seedWithRealWeather);
        }}
        useRealWeather={useRealWeather}
      />
      <CancelBookingModal
        open={cancelModalOpen}
        booking={bookingPendingCancel}
        onClose={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
        loading={cancelling}
        role={effectiveRole}
      />
    </div>
  );
};

export default DashboardPage;
