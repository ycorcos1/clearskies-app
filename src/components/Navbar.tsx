"use client";

import Link from "next/link";
import { Plane } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed inset-x-0 top-0 z-30 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-10 lg:px-16">
        <Link
          href="/"
          className="flex items-center gap-3 text-slate-100 transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10 text-sky-300">
            <Plane className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-400">
              ClearSkies
            </span>
            <span className="text-sm font-semibold text-white">
              Flight Operations
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-400 hover:text-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            Login
          </Link>
          <Link
            href="/login?mode=signup"
            className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
