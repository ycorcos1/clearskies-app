"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { useAuthUser } from "../../hooks/useAuthUser";
import { auth, db } from "../../lib/firebaseConfig";
import { getFirstInstructorId } from "../../lib/users";
import { showErrorToast } from "../../lib/toast";

const DEFAULT_SETTINGS = {
  notifications: {
    emailWeatherAlerts: true,
    emailReschedule: true,
    emailWeatherImproved: true,
    inAppToasts: true,
  },
  theme: "light",
};

type AuthMode = "login" | "signup";

type UserRole = "student" | "instructor";

const LoginPageContent = () => {
  const searchParams = useSearchParams();
  const initialMode = (
    searchParams?.get("mode") === "signup" ? "signup" : "login"
  ) as AuthMode;
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { user, loading } = useAuthUser();

  useEffect(() => {
    if (!searchParams) return;
    const modeParam = searchParams.get("mode");
    if (modeParam === "signup") {
      setMode("signup");
    } else if (modeParam === "login") {
      setMode("login");
    }
  }, [searchParams]);

  useEffect(() => {
    if (mode === "login") {
      setRole("student");
    }
  }, [mode]);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (busy) {
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const selectedRole = role;
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        if (name.trim().length > 0) {
          await updateProfile(credential.user, {
            displayName: name.trim(),
          });
        }

        const instructorId =
          selectedRole === "student" ? await getFirstInstructorId() : null;

        const baseDoc: Record<string, unknown> = {
          id: credential.user.uid,
          name: name.trim() || credential.user.email,
          email: credential.user.email,
          phone: "",
          role: selectedRole,
          createdAt: serverTimestamp(),
          settings: {
            ...DEFAULT_SETTINGS,
            updatedAt: serverTimestamp(),
          },
        };

        if (selectedRole === "student") {
          baseDoc.trainingLevel = "student";
          if (instructorId) {
            baseDoc.assignedInstructor = instructorId;
          }
        }

        await setDoc(doc(db, "students", credential.user.uid), baseDoc, {
          merge: true,
        });

        localStorage.setItem("clearskies-theme", DEFAULT_SETTINGS.theme);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      router.replace("/dashboard");
    } catch (error: any) {
      const message =
        error?.message ??
        (mode === "signup"
          ? "Unable to create account. Please try again."
          : "Unable to sign in. Please verify your credentials and try again.");
      showErrorToast(message);
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode((prev) => (prev === "login" ? "signup" : "login"));
  };

  return (
    <main className="grid min-h-screen bg-slate-950 text-slate-100 lg:grid-cols-2">
      <div className="relative hidden flex-col overflow-hidden border-r border-slate-900/70 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-10 py-12 lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.25),transparent_55%)]" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-sky-300 transition hover:border-slate-600"
            >
              <span>☀️</span>
              ClearSkies
            </Link>
            <h1 className="mt-10 text-4xl font-semibold leading-tight text-white">
              Every training flight begins with a weather-ready plan.
            </h1>
            <p className="mt-5 max-w-lg text-sm text-slate-300">
              ClearSkies watches the entire forecast pipeline, automates safety
              checks, and guides pilots to the next best time to fly. Log in to
              see real-time alerts, AI reschedules, and complete booking
              visibility.
            </p>
          </div>
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-sm font-semibold text-white">
                Live Weather Guardrails
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Hourly WeatherAPI monitoring paired with deterministic logic keeps
                student pilots grounded when conditions are unsafe.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-sm font-semibold text-white">
                AI-Powered Rescheduling
              </p>
              <p className="mt-1 text-xs text-slate-400">
                OpenAI proposes tailored alternatives with pilot-friendly
                explanations, ready for one-click confirmation.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-screen flex-col justify-center px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-400">
                ClearSkies Access
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {mode === "login"
                  ? "Sign in to mission control"
                  : `Create your ${role === "student" ? "student" : "instructor"} account`}
              </h2>
            </div>
            <Link
              href="/"
              className="text-xs font-semibold text-slate-400 transition hover:text-slate-200"
            >
              ← Back home
            </Link>
          </div>

          <div className="mt-6 flex rounded-full border border-slate-800 bg-slate-900/80 p-1 text-xs font-semibold text-slate-400">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-full px-4 py-2 transition ${
                mode === "login"
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30"
                  : "hover:text-slate-200"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-full px-4 py-2 transition ${
                mode === "signup"
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30"
                  : "hover:text-slate-200"
              }`}
            >
              Create Account
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/40 backdrop-blur"
          >
            {mode === "signup" && (
              <div>
                <label
                  htmlFor="name"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Avery Pilot"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
            )}

            {mode === "signup" && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Account Type
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label
                    className={`flex cursor-pointer items-start space-x-2 rounded-lg border px-3 py-2 text-sm transition ${
                      role === "student"
                        ? "border-sky-500 bg-sky-500/10 text-white"
                        : "border-slate-700 bg-slate-800/80 text-slate-200 hover:border-slate-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="student"
                      checked={role === "student"}
                      onChange={() => setRole("student")}
                      className="mt-1 h-4 w-4 border-slate-600 text-sky-500 focus:ring-sky-500"
                    />
                    <span className="flex flex-col">
                      <span className="font-semibold">Student</span>
                      <span className="text-xs text-slate-400">
                        Access alerts, AI reschedules, and training resources.
                      </span>
                    </span>
                  </label>
                  <label
                    className={`flex cursor-pointer items-start space-x-2 rounded-lg border px-3 py-2 text-sm transition ${
                      role === "instructor"
                        ? "border-sky-500 bg-sky-500/10 text-white"
                        : "border-slate-700 bg-slate-800/80 text-slate-200 hover:border-slate-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="instructor"
                      checked={role === "instructor"}
                      onChange={() => setRole("instructor")}
                      className="mt-1 h-4 w-4 border-slate-600 text-sky-500 focus:ring-sky-500"
                    />
                    <span className="flex flex-col">
                      <span className="font-semibold">Instructor</span>
                      <span className="text-xs text-slate-400">
                        Monitor student pilots and manage weather decisions.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy
                ? "Please wait…"
                : mode === "login"
                ? "Sign In"
                : "Create Account"}
            </button>

            <p className="text-center text-xs text-slate-400">
              {mode === "login" ? "Need an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="font-semibold text-sky-400 hover:text-sky-300"
                onClick={switchMode}
              >
                {mode === "login" ? "Create one" : "Sign in"}
              </button>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
};

const LoginPage = () => {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen bg-slate-950 text-slate-100 lg:grid-cols-2">
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-sm text-slate-400">Loading...</p>
          </div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
};

export default LoginPage;
