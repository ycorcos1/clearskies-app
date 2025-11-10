import Link from "next/link";

import Navbar from "../../components/Navbar";

const workflowDetails = [
  {
    title: "Monitor changing sky conditions",
    description:
      "Every 60 minutes, ClearSkies ingests WeatherAPI.com data for each scheduled flight. Custom thresholds track visibility, wind, cloud ceilings, and precipitation tailored to your fleet and training policies.",
    bullets: [
      "Automated polling via Firebase Cloud Scheduler",
      "Regional weather overlays for all training airports",
      "Fallback safeguards to alert if data sources degrade",
    ],
  },
  {
    title: "Evaluate safety against pilot profiles",
    description:
      "We grade each flight against configurable minima per pilot type—student, private, or instrument-rated. When a metric trends unsafe, ClearSkies annotates the risk with plain-language explanations.",
    bullets: [
      "Pilot training level controls decision boundaries",
      "Threshold history shows how often a route is impacted",
      "Explainability layer surfaces the exact factors triggering a warning",
    ],
  },
  {
    title: "Reschedule with confidence in one tap",
    description:
      "When weather forces a change, OpenAI drafts three alternative times that meet updated thresholds. Students receive an email and optional in-app toast with the same context your ops team sees.",
    bullets: [
      "AI-assisted messaging ensures consistent tone and clarity",
      "One-click confirmations sync directly back to Firestore",
      "Audit trail logs every change to simplify instructor reviews",
    ],
  },
];

const integrations = [
  {
    label: "Firebase Backbone",
    body: "Firestore stores pilot profiles, training thresholds, and flight manifests. Authentication secures instructor and student access.",
  },
  {
    label: "Weather Data Streams",
    body: "WeatherAPI.com delivers METAR-style datasets. Redundant fetch logic retries with exponential backoff to avoid stale forecasts.",
  },
  {
    label: "AI Copilot",
    body: "OpenAI generates rescheduling options and safety narratives, freeing staff from repetitive phone calls.",
  },
];

export default function LearnPage() {
  return (
    <main className="min-h-screen bg-slate-950 pt-20 text-slate-100">
      <Navbar />

      <header className="border-b border-slate-800/60 bg-slate-950/70">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:px-10 lg:px-16">
          <span className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-sky-300">
            Learn How ClearSkies Works
          </span>
          <h1 className="mt-6 text-4xl font-semibold text-white sm:text-5xl">
            Weather intelligence that respects your training pipeline.
          </h1>
          <p className="mt-6 text-base text-slate-300 sm:text-lg">
            ClearSkies blends deterministic guardrails with AI-assisted
            communication so dispatchers and instructors can focus on the next
            flight—not tedious rescheduling logistics.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              Get Started
            </Link>
            <Link
              href="mailto:hello@clearskies.app"
              className="inline-flex items-center justify-center rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              Talk to the Team
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-slate-800/60 bg-slate-950/60 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-16">
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">
            The ClearSkies workflow in depth
          </h2>
          <p className="mt-4 max-w-3xl text-sm text-slate-300 sm:text-base">
            Each step is auditable and transparent, so flight schools keep full
            control while automating the busy work. Students always see why a
            decision was made, and instructors get the metrics to back it up.
          </p>
          <div className="mt-12 grid gap-8">
            {workflowDetails.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-lg shadow-slate-900/40"
              >
                <h3 className="text-2xl font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm text-slate-300 sm:text-base">
                  {item.description}
                </p>
                <ul className="mt-6 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                  {item.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-left text-slate-200"
                    >
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-800/60 bg-slate-950 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-16">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                Built on proven infrastructure
              </h2>
              <p className="mt-4 text-sm text-slate-300 sm:text-base">
                ClearSkies plugs into your existing Firebase project, so you can
                start with the tooling you already trust. Each integration is
                modular—swap data providers or AI models without rewiring your
                whole stack.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-300 shadow-lg shadow-slate-900/40">
              <p className="font-medium text-white">Implementation Snapshot</p>
              <ul className="mt-4 space-y-3">
                <li>• Firebase Authentication guards student dashboards</li>
                <li>• Firestore documents map pilots to training levels</li>
                <li>• Scheduled Cloud Functions keep forecasts current</li>
                <li>• React Toasts surface in-app safety alerts instantly</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-900/40"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                  {item.label}
                </p>
                <p className="mt-3 text-sm text-slate-300">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-20 text-center sm:py-28">
        <div className="mx-auto max-w-3xl px-6 sm:px-10 lg:px-16">
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">
            Ready to automate weather decisions?
          </h2>
          <p className="mt-4 text-sm text-slate-300 sm:text-base">
            Launch ClearSkies for your next training cycle. Your pilots stay
            informed, your instructors stay focused, and your ops team gets a
            reliable audit trail.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              Get Started
            </Link>
            <Link
              href="mailto:hello@clearskies.app"
              className="inline-flex items-center justify-center rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              Talk to the Team
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        ClearSkies © {new Date().getFullYear()} • AI-powered weather awareness
        for flight training.
      </footer>
    </main>
  );
}
