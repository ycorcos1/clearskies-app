"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { toast } from "react-toastify";

import DashboardHeader from "../../components/dashboard/Header";
import { useAuthUser } from "../../hooks/useAuthUser";
import { useStudentSettings } from "../../hooks/useStudentSettings";
import type { TrainingLevel } from "../../data/types";
import { auth, db } from "../../lib/firebaseConfig";
import { showErrorToast } from "../../lib/toast";
import { updateTrainingLevel } from "../../lib/updateTrainingLevel";

const phonePattern = /^\(\d{3}\) \d{3}-\d{4}$/;

const TRAINING_LEVEL_LABELS: Record<TrainingLevel, string> = {
  student: "Student Pilot",
  private: "Private Pilot",
  instrument: "Instrument Rated",
};

const TRAINING_LEVEL_MINIMA: Record<TrainingLevel, string[]> = {
  student: [
    "Requires clear skies or scattered clouds",
    "Visibility greater than 5 statute miles",
    "Surface winds below 10 knots",
  ],
  private: [
    "Ceiling above 1,000 ft",
    "Visibility greater than 3 statute miles",
    "Surface winds below 20 knots",
  ],
  instrument: [
    "IMC operations allowed when no convective activity is present",
    "Visibility greater than 1 statute mile",
    "Avoid icing and embedded thunderstorms",
  ],
};

const SettingsPage = () => {
  const router = useRouter();
  const { user, loading: authLoading, role } = useAuthUser();
  const {
    settings,
    loading: settingsLoading,
    saving,
    updateSettings,
    error,
  } = useStudentSettings(user?.uid);
  const [phone, setPhone] = useState("");
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel>("student");
  const [currentTrainingLevel, setCurrentTrainingLevel] =
    useState<TrainingLevel>("student");
  const [changingTrainingLevel, setChangingTrainingLevel] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const isLoading = authLoading || settingsLoading;
  const isStudentRole = role === "student";
  const isTrainingLevelDirty = trainingLevel !== currentTrainingLevel;

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    let active = true;

    const hydrateProfile = async () => {
      if (!user) {
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "students", user.uid));
        if (!snapshot.exists()) {
          return;
        }

        const data = snapshot.data() as {
          phone?: string;
          trainingLevel?: TrainingLevel;
        };

        if (!active) {
          return;
        }

        setPhone(data?.phone ?? "");
        if (data?.trainingLevel) {
          setTrainingLevel(data.trainingLevel);
          setCurrentTrainingLevel(data.trainingLevel);
        }
      } catch (err: any) {
        if (!active) {
          return;
        }

        showErrorToast(
          err?.message ?? "Failed to load profile information. Please refresh."
        );
      }
    };

    hydrateProfile();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!settings?.theme) {
      return;
    }

    const isDark = settings.theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("clearskies-theme", settings.theme);
  }, [settings?.theme]);

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  const handleProfileSave = async () => {
    if (!user) {
      return;
    }

    if (phone && !phonePattern.test(phone)) {
      showErrorToast("Phone number must be in the format (XXX) XXX-XXXX.");
      return;
    }

    setSavingProfile(true);

    try {
      await setDoc(
        doc(db, "students", user.uid),
        {
          phone,
          lastModified: serverTimestamp(),
        },
        { merge: true }
      );

      toast.success("Profile updated successfully.");
    } catch (err: any) {
      showErrorToast(
        err?.message ?? "Failed to update profile. Please try again."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleTrainingLevelUpdate = async () => {
    if (!user || !isStudentRole) {
      return;
    }

    if (trainingLevel === currentTrainingLevel) {
      toast.info("Training level already applied.");
      return;
    }

    setChangingTrainingLevel(true);

    try {
      await updateTrainingLevel(trainingLevel);
      setCurrentTrainingLevel(trainingLevel);
      toast.success("Training level updated. Weather assessments refreshed.");
    } catch (err: any) {
      showErrorToast(
        err?.message ?? "Unable to update training level. Please try again."
      );
      setTrainingLevel(currentTrainingLevel);
    } finally {
      setChangingTrainingLevel(false);
    }
  };

  const handleNotificationToggle = async (
    key: keyof NonNullable<typeof settings>["notifications"],
    checked: boolean
  ) => {
    if (!settings) {
      return;
    }

    try {
      await updateSettings({
        notifications: {
          ...settings.notifications,
          [key]: checked,
        },
      });
    } catch (err: any) {
      showErrorToast(
        err?.message ??
          "Unable to update notification preferences at this time."
      );
    }
  };

  const handleThemeChange = async (theme: "light" | "dark") => {
    try {
      await updateSettings({ theme });
    } catch (err: any) {
      showErrorToast(
        err?.message ?? "Failed to update theme preference. Please retry."
      );
    }
  };

  if (!user && !authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Redirecting to login…
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <DashboardHeader
        userId={user?.uid}
        userName={user?.displayName ?? user?.email ?? undefined}
        userRole={role ?? "student"}
        onLogout={handleLogout}
      />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Loading your settings…
          </div>
        ) : (
          <>
            <div className="space-y-6">
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                      Settings
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Manage your profile, notifications, and display
                      preferences.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Profile
                </h2>
                <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                  Update your contact details and training level.
                </p>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                      htmlFor="settings-name"
                    >
                      Name
                    </label>
                    <input
                      id="settings-name"
                      type="text"
                      className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      value={user?.displayName ?? ""}
                      disabled
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                      htmlFor="settings-email"
                    >
                      Email
                    </label>
                    <input
                      id="settings-email"
                      type="email"
                      className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      value={user?.email ?? ""}
                      disabled
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                      htmlFor="settings-phone"
                    >
                      Phone
                    </label>
                    <input
                      id="settings-phone"
                      type="tel"
                      placeholder="(650) 555-0199"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      Format: (XXX) XXX-XXXX
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                      htmlFor="settings-training"
                    >
                      Training Level
                    </label>
                    {isStudentRole ? (
                      <>
                        <select
                          id="settings-training"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          value={trainingLevel}
                          disabled={changingTrainingLevel}
                          onChange={(event) =>
                            setTrainingLevel(event.target.value as TrainingLevel)
                          }
                        >
                          <option value="student">Student Pilot</option>
                          <option value="private">Private Pilot</option>
                          <option value="instrument">Instrument Rated</option>
                        </select>
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">
                            {TRAINING_LEVEL_LABELS[trainingLevel]} Minimums
                          </p>
                          <ul className="mt-2 space-y-1">
                            {TRAINING_LEVEL_MINIMA[trainingLevel].map((item) => (
                              <li key={item} className="flex items-start gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                          Changing away from Student Pilot removes instructor oversight. No notifications are sent for training level changes.
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={handleTrainingLevelUpdate}
                            disabled={!isTrainingLevelDirty || changingTrainingLevel}
                            className="inline-flex items-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {changingTrainingLevel ? "Updating…" : "Apply Training Level"}
                          </button>
                          {!isTrainingLevelDirty ? (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Current level: {TRAINING_LEVEL_LABELS[currentTrainingLevel]}
                            </span>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">
                          {TRAINING_LEVEL_LABELS[currentTrainingLevel]}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Training level is managed by your instructor.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleProfileSave}
                    disabled={savingProfile}
                    className="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingProfile ? "Saving…" : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Sign Out
                  </button>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Notification Preferences
                </h2>
                <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                  Choose how you’d like ClearSkies to keep you updated.
                </p>

                <div className="space-y-4">
                  {[
                    {
                      key: "emailWeatherAlerts" as const,
                      label: "Email: Weather Alerts",
                      description:
                        "Get notified when your flights are flagged for unsafe weather.",
                    },
                    {
                      key: "emailReschedule" as const,
                      label: "Email: Reschedule Confirmations",
                      description:
                        "Receive confirmation emails when you select a new flight time.",
                    },
                    {
                      key: "emailWeatherImproved" as const,
                      label: "Email: Weather Improvements",
                      description:
                        "Stay informed when weather returns to safe flying conditions.",
                    },
                    {
                      key: "inAppToasts" as const,
                      label: "In-App Toasts",
                      description:
                        "See real-time toast alerts for critical safety updates.",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/70 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {item.label}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.description}
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={Boolean(settings?.notifications[item.key])}
                          disabled={saving || !settings}
                          onChange={(event) =>
                            handleNotificationToggle(
                              item.key,
                              event.target.checked
                            )
                          }
                        />
                        <div className="h-6 w-11 rounded-full border border-slate-300 bg-slate-300 transition peer-checked:border-sky-500 peer-checked:bg-sky-500 dark:border-slate-600 dark:bg-slate-700 dark:peer-checked:border-sky-500 dark:peer-checked:bg-sky-500" />
                        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5 dark:bg-slate-200" />
                      </label>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Display Preferences
                </h2>
                <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                  Toggle the visual appearance of the ClearSkies dashboard.
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleThemeChange("light")}
                    disabled={saving || !settings}
                    className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                      settings?.theme === "light"
                        ? "bg-sky-600 text-white"
                        : "border border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    Light Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange("dark")}
                    disabled={saving || !settings}
                    className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                      settings?.theme === "dark"
                        ? "bg-sky-600 text-white"
                        : "border border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    Dark Mode
                  </button>
                </div>
              </section>
            </div>
            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                {error}
              </div>
            )}
          </>
        )}
      </main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        ClearSkies © 2025
      </footer>
    </div>
  );
};

export default SettingsPage;
