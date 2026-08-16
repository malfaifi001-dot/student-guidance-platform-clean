"use client";

import Link from "next/link";
import { School } from "lucide-react";
import { useEffect, useState } from "react";

export type WorkspaceHeaderCtaOption = {
  key: string;
  label: string;
  href: string;
};

const ROTATION_MS = 24 * 60 * 60 * 1000;

export function WorkspaceHeaderCta({
  identityComplete,
  userId,
  options,
}: {
  identityComplete: boolean;
  userId?: string | null;
  options: WorkspaceHeaderCtaOption[];
}) {
  const [selected, setSelected] = useState<WorkspaceHeaderCtaOption | null>(null);

  useEffect(() => {
    if (!identityComplete || options.length === 0) return;

    const storageKey = `teachix:workspace-header-cta:${userId || "current-user"}`;
    const fallback = options[0];

    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null") as
        | { key?: string; selectedAt?: number }
        | null;
      const savedOption = options.find((option) => option.key === saved?.key);

      if (
        savedOption &&
        typeof saved?.selectedAt === "number" &&
        Date.now() - saved.selectedAt < ROTATION_MS
      ) {
        setSelected(savedOption);
        return;
      }

      const rotationPool = savedOption
        ? options.filter((option) => option.key !== savedOption.key)
        : [fallback];
      const nextOption =
        rotationPool[Math.floor(Math.random() * rotationPool.length)] || fallback;
      localStorage.setItem(
        storageKey,
        JSON.stringify({ key: nextOption.key, selectedAt: Date.now() }),
      );
      setSelected(nextOption);
    } catch {
      setSelected(fallback);
    }
  }, [identityComplete, options, userId]);

  if (!identityComplete) {
    return (
      <Link
        href="/dashboard/settings/school"
        aria-label="أكمل هوية المدرسة!"
        className="group relative inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-white px-5 py-3 text-sm font-black text-sky-700 shadow-sm ring-1 ring-white/70 transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-sky-700 motion-safe:animate-[pulse_3s_ease-in-out_infinite]"
      >
        <span className="absolute inset-0 rounded-2xl bg-sky-50/60 opacity-0 transition-opacity group-hover:opacity-100" />
        <School className="relative h-4 w-4" aria-hidden="true" />
        <span className="relative">أكمل هوية المدرسة!</span>
      </Link>
    );
  }

  if (!selected) return null;

  return (
    <Link
      href={selected.href}
      aria-label={selected.label}
      className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white/90 px-4 py-2 text-xs font-black text-sky-800 shadow-sm ring-1 ring-white/70 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-sky-700"
    >
      {selected.label}
    </Link>
  );
}
