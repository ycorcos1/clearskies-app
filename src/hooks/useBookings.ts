"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type FirestoreError,
  type Query,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import type { FlightBooking } from "../data/types";
import { db } from "../lib/firebaseConfig";
import { convertMeridiemTimeTo24Hour } from "../utils/format";

interface DashboardBookingsState {
  upcoming: FlightBooking[];
  alerts: FlightBooking[];
  loading: boolean;
  error?: string;
}

const collectionRef = collection(db, "bookings");

const deserializeBooking = (doc: QueryDocumentSnapshot): FlightBooking => {
  const data = doc.data() as FlightBooking;
  return {
    ...data,
    id: doc.id,
  };
};

const sortBookingsByDateTime = (bookings: FlightBooking[]): FlightBooking[] => {
  return [...bookings].sort((a, b) => {
    // First sort by date
    if (a.scheduledDate && b.scheduledDate) {
      const dateCompare = a.scheduledDate.localeCompare(b.scheduledDate);
      if (dateCompare !== 0) {
        return dateCompare;
      }
    } else if (a.scheduledDate) {
      return -1;
    } else if (b.scheduledDate) {
      return 1;
    }

    // If dates are equal (or both missing), sort by time
    if (a.scheduledTime && b.scheduledTime) {
      const timeA = convertMeridiemTimeTo24Hour(a.scheduledTime);
      const timeB = convertMeridiemTimeTo24Hour(b.scheduledTime);
      return timeA.localeCompare(timeB);
    } else if (a.scheduledTime) {
      return -1;
    } else if (b.scheduledTime) {
      return 1;
    }

    return 0;
  });
};

const buildUpcomingQuery = (
  userId: string,
  role: "student" | "instructor"
): Query => {
  if (role === "instructor") {
    return query(
      collectionRef,
      where("assignedInstructor", "==", userId),
      where("status", "==", "scheduled"),
      orderBy("scheduledDate"),
      orderBy("scheduledTime")
    );
  }

  return query(
    collectionRef,
    where("studentId", "==", userId),
    where("status", "==", "scheduled"),
    orderBy("scheduledDate"),
    orderBy("scheduledTime")
  );
};

const buildAlertsQuery = (
  userId: string,
  role: "student" | "instructor"
): Query => {
  if (role === "instructor") {
    return query(
      collectionRef,
      where("assignedInstructor", "==", userId),
      where("status", "==", "scheduled"),
      where("weatherStatus", "in", ["caution", "unsafe"]),
      orderBy("scheduledDate"),
      orderBy("scheduledTime")
    );
  }

  return query(
    collectionRef,
    where("studentId", "==", userId),
    where("status", "==", "scheduled"),
    where("weatherStatus", "in", ["caution", "unsafe"]),
    orderBy("scheduledDate"),
    orderBy("scheduledTime")
  );
};

export const useDashboardBookings = (
  userId?: string,
  role?: "student" | "instructor"
): DashboardBookingsState => {
  const [upcoming, setUpcoming] = useState<FlightBooking[]>([]);
  const [alerts, setAlerts] = useState<FlightBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!userId) {
      setUpcoming([]);
      setAlerts([]);
      setLoading(false);
      return;
    }

    const normalizedRole: "student" | "instructor" = role ?? "student";

    setLoading(true);
    setError(undefined);

    let pendingUpcoming = true;
    let pendingAlerts = true;

    const handleError = (err: FirestoreError) => {
      // Ignore transient errors during data updates (e.g., training level changes)
      // These are harmless and the query will recover automatically
      if (
        err.code === "unavailable" ||
        err.code === "deadline-exceeded" ||
        err.code === "cancelled" ||
        err.message?.includes("Request timeout") ||
        err.message?.includes("Bad Request")
      ) {
        console.warn(
          `[useBookings] Transient query error (${normalizedRole}), will retry:`,
          err.code,
          err.message
        );
        return;
      }

      // Only set error for actual failures
      console.error(
        `[useBookings] Query error (${normalizedRole}):`,
        err.code,
        err.message
      );
      setError(err.message);
    };

    const upcomingUnsubscribe = onSnapshot(
      buildUpcomingQuery(userId, normalizedRole),
      (snapshot) => {
        console.log(`[useBookings] Upcoming query (${normalizedRole}):`, {
          userId,
          role: normalizedRole,
          count: snapshot.docs.length,
        });
        const bookings = snapshot.docs.map(deserializeBooking);
        setUpcoming(sortBookingsByDateTime(bookings));
        pendingUpcoming = false;
        if (!pendingAlerts) {
          setLoading(false);
        }
      },
      (err) => {
        console.error(
          `[useBookings] Upcoming query error (${normalizedRole}):`,
          err
        );
        handleError(err);
        pendingUpcoming = false;
        if (!pendingAlerts) {
          setLoading(false);
        }
      }
    );

    const alertsUnsubscribe = onSnapshot(
      buildAlertsQuery(userId, normalizedRole),
      (snapshot) => {
        console.log(`[useBookings] Alerts query (${normalizedRole}):`, {
          userId,
          role: normalizedRole,
          count: snapshot.docs.length,
        });
        const bookings = snapshot.docs.map(deserializeBooking);
        setAlerts(sortBookingsByDateTime(bookings));
        pendingAlerts = false;
        if (!pendingUpcoming) {
          setLoading(false);
        }
      },
      (err) => {
        console.error(
          `[useBookings] Alerts query error (${normalizedRole}):`,
          err
        );
        handleError(err);
        pendingAlerts = false;
        if (!pendingUpcoming) {
          setLoading(false);
        }
      }
    );

    return () => {
      upcomingUnsubscribe();
      alertsUnsubscribe();
    };
  }, [userId, role]);

  return {
    upcoming,
    alerts,
    loading,
    error,
  };
};
