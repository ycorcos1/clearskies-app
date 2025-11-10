"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type FirestoreError,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

import type { NotificationEvent } from "../data/types";
import app, { db } from "../lib/firebaseConfig";

interface NotificationDoc extends NotificationEvent {
  id: string;
}

export interface UseNotificationsResult {
  notifications: NotificationDoc[];
  unreadCount: number;
  loading: boolean;
  error?: string;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const parseNotification = (
  snapshot: QueryDocumentSnapshot
): NotificationDoc => {
  const data = snapshot.data() as NotificationEvent;
  return {
    ...data,
    id: snapshot.id,
  };
};

export const useNotifications = (userId?: string): UseNotificationsResult => {
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);

    // Fetch latest notifications via callable as a fallback to ensure we have data
    const functions = getFunctions(app, "us-central1");
    const listNotifications = httpsCallable<
      Record<string, never>,
      { events?: NotificationEvent[] }
    >(functions, "listNotificationEvents");

    void listNotifications({})
      .then((response) => {
        const events = response.data?.events ?? [];
        const normalizedEvents: NotificationDoc[] = events
          .filter((event): event is NotificationDoc => Boolean(event))
          .map((event) => ({
            ...event,
            id: event.id ?? `${event.userId}-${event.bookingId}-${event.type}`,
          }));

        if (normalizedEvents.length) {
          setNotifications(normalizedEvents);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch notifications", err);
      });

    const notificationsQuery = query(
      collection(db, "notificationEvents"),
      where("userId", "==", userId),
      where("read", "==", false),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        setNotifications(snapshot.docs.map(parseNotification));
        setLoading(false);
      },
      (err: FirestoreError) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notificationEvents", id), {
        read: true,
      });
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const markAllAsRead = async () => {
    const updates = notifications
      .filter((item) => !item.read)
      .map((item) =>
        updateDoc(doc(db, "notificationEvents", item.id), {
          read: true,
        })
      );

    await Promise.allSettled(updates);
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
  };
};
