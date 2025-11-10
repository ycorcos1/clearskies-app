"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import type { Student, TrainingLevel } from "../data/types";
import { auth, db } from "../lib/firebaseConfig";

export interface AuthState {
  user: User | null;
  loading: boolean;
  role?: Student["role"];
  trainingLevel?: TrainingLevel;
  assignedInstructor?: string;
  profile?: Student | null;
}

export const useAuthUser = (): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let profileUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!isMounted) {
        return;
      }

      setUser(currentUser);

      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (!currentUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      // Listen for real-time updates to the user profile
      const docRef = doc(db, "students", currentUser.uid);
      profileUnsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          if (!isMounted) {
            return;
          }

          if (snapshot.exists()) {
            const data = snapshot.data() as Student;
            const normalized: Student = {
              ...data,
              id: data.id ?? currentUser.uid,
              role: data.role ?? "student",
            };
            setProfile(normalized);
          } else {
            setProfile(null);
          }
          setLoading(false);
        },
        (error) => {
          if (!isMounted) {
            return;
          }

          // Ignore transient errors during data updates (e.g., training level changes)
          // These are harmless and the query will recover automatically
          if (
            error.code === "unavailable" ||
            error.code === "deadline-exceeded" ||
            error.code === "cancelled" ||
            error.message?.includes("Request timeout") ||
            error.message?.includes("Bad Request")
          ) {
            console.warn(
              "Transient error loading user profile (will retry):",
              error.code,
              error.message
            );
            // Don't clear profile on transient errors - keep existing data
            return;
          }

          // Only log actual failures
          console.error("Failed to load user profile", error);
          setProfile(null);
          setLoading(false);
        }
      );
    });

    return () => {
      isMounted = false;
      unsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, []);

  return {
    user,
    loading,
    role: profile?.role,
    trainingLevel: profile?.trainingLevel,
    assignedInstructor: profile?.assignedInstructor,
    profile,
  };
};
