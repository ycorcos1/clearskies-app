"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentReference,
} from "firebase/firestore";

import type { StudentSettings } from "../data/types";
import { db } from "../lib/firebaseConfig";

const DEFAULT_SETTINGS: StudentSettings = {
  notifications: {
    emailWeatherAlerts: true,
    emailReschedule: true,
    emailWeatherImproved: true,
    inAppToasts: true,
  },
  theme: "light",
};

const mergeWithDefaults = (
  settings?: StudentSettings | null
): StudentSettings => {
  return {
    ...DEFAULT_SETTINGS,
    ...(settings ?? {}),
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      ...(settings?.notifications ?? {}),
    },
  };
};

export interface UseStudentSettingsState {
  settings: StudentSettings | null;
  loading: boolean;
  saving: boolean;
  error?: string;
  updateSettings: (partial: Partial<StudentSettings>) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useStudentSettings = (uid?: string): UseStudentSettingsState => {
  const [settings, setSettings] = useState<StudentSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const studentDoc = useMemo<DocumentReference | undefined>(() => {
    if (!uid) {
      return undefined;
    }
    return doc(db, "students", uid);
  }, [uid]);

  const loadSettings = useCallback(async () => {
    if (!studentDoc) {
      setSettings(null);
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const snapshot = await getDoc(studentDoc);

      if (!snapshot.exists()) {
        await setDoc(
          studentDoc,
          {
            settings: {
              ...DEFAULT_SETTINGS,
              updatedAt: serverTimestamp(),
            },
          },
          { merge: true }
        );
        setSettings({ ...DEFAULT_SETTINGS });
        return;
      }

      const data = snapshot.data() as
        | { settings?: StudentSettings }
        | undefined;

      if (!data?.settings) {
        await updateDoc(studentDoc, {
          "settings.notifications": DEFAULT_SETTINGS.notifications,
          "settings.theme": DEFAULT_SETTINGS.theme,
          "settings.updatedAt": serverTimestamp(),
        });
        setSettings({ ...DEFAULT_SETTINGS });
        return;
      }

      setSettings(mergeWithDefaults(data.settings));
    } catch (err: any) {
      setError(err?.message ?? "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [studentDoc]);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!studentDoc) {
        setSettings(null);
        return;
      }
      await loadSettings();
      if (!active) {
        return;
      }
    })();

    return () => {
      active = false;
    };
  }, [studentDoc, loadSettings]);

  const updateSettings = useCallback(
    async (partial: Partial<StudentSettings>) => {
      if (!studentDoc) {
        return;
      }

      const payload: Record<string, unknown> = {
        "settings.updatedAt": serverTimestamp(),
      };

      if (partial.notifications) {
        payload["settings.notifications"] = {
          ...DEFAULT_SETTINGS.notifications,
          ...partial.notifications,
        };
      }

      if (partial.theme) {
        payload["settings.theme"] = partial.theme;
      }

      setSaving(true);
      setError(undefined);

      try {
        await updateDoc(studentDoc, payload);

        setSettings((prev) =>
          mergeWithDefaults({
            ...(prev ?? DEFAULT_SETTINGS),
            notifications: {
              ...((prev ?? DEFAULT_SETTINGS).notifications ?? {}),
              ...(partial.notifications ?? {}),
            },
            theme:
              partial.theme ??
              (prev ?? DEFAULT_SETTINGS).theme ??
              DEFAULT_SETTINGS.theme,
          })
        );
      } catch (err: any) {
        const message = err?.message ?? "Failed to update settings";
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [studentDoc]
  );

  const refresh = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    saving,
    error,
    updateSettings,
    refresh,
  };
};
