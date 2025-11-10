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
        setUpcoming(snapshot.docs.map(deserializeBooking));
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
        setAlerts(snapshot.docs.map(deserializeBooking));
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
