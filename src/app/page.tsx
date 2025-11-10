"use client";

import Link from "next/link";

import Navbar from "../components/Navbar";

const features = [
  {
    title: "Deterministic Weather Safety",
    description:
      "Automated logic checks hourly forecasts against training minimums so every pilot knows when skies are flyable.",
  },
  {
    title: "AI-Assisted Rescheduling",
    description:
      "OpenAI generates friendly explanations and three viable alternatives when conditions turn unsafe.",
  },
  {
    title: "Real-time Alerts & Toasts",
    description:
      "Students stay informed with instant email and in-app notifications tailored to their preferences.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Monitor",
    body: "Firebase Cloud Scheduler checks every booked flight each hour using WeatherAPI.com data.",
  },
  {
    step: "02",
    title: "Evaluate",
    body: "ClearSkies applies transparent safety thresholds based on pilot training level and current hazards.",
  },
  {
    step: "03",
    title: "Reschedule",
    body: "Unsafe flights trigger AI-guided options plus automated notifications so students confirm in one tap.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 pt-20 text-slate-100">
      <Navbar />
      <header className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.25),transparent_55%)]" />
        <div className="relative z-10 mx-auto flex min-h-[75vh] max-w-6xl flex-col justify-center gap-10 px-6 py-24 sm:px-10 lg:px-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-sky-300">
              Flight Training Safety
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-slate-50 sm:text-5xl lg:text-6xl">
              Smarter weather intelligence for every instructional flight.
            </h1>
            <p className="mt-6 text-base text-slate-300 sm:text-lg">
              ClearSkies monitors live conditions, flags risk instantly, and
              helps your students reschedule with AI-guided confidence. Build a
              safer, more reliable training pipeline with automation you can
              trust.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                Get Started
              </Link>
              <Link
                href="/learn"
                className="inline-flex items-center justify-center rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                Learn how it works →
              </Link>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 shadow-lg shadow-slate-900/40 backdrop-blur"
              >
                <h3 className="text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm text-slate-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section
        id="learn-more"
        className="border-t border-slate-800 bg-slate-950/60 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-6 sm:px-10 lg:px-16">
          <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-400">
                Operational Workflow
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                Automated from forecast to student confirmation.
              </h2>
            </div>
            <p className="text-sm text-slate-400 sm:text-base">
              Explore how ClearSkies orchestrates each flight operation step,
              from proactive monitoring to guided rescheduling.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {workflow.map((item) => (
              <div
                key={item.title}
                className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-lg shadow-slate-900/50"
              >
                <span className="text-5xl font-semibold text-slate-700">
                  {item.step}
                </span>
                <h3 className="mt-6 text-xl font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm text-slate-300">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800 bg-slate-950 py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-6 text-center sm:px-10 lg:px-0">
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">
            Bring flight school operations into clear skies.
          </h2>
          <p className="mt-4 text-base text-slate-300 sm:text-lg">
            Plug ClearSkies into your existing Firebase project, configure API
            keys, and let automation keep pilots informed with precision—not
            guesswork.
          </p>
          <Link
            href="mailto:hello@clearskies.app"
            className="mt-8 inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            Talk to the Team
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        ClearSkies © {new Date().getFullYear()} • AI-powered weather awareness
        for flight training.
      </footer>
    </main>
  );
}
