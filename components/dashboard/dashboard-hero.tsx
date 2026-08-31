import Link from "next/link";
import type { ReactNode } from "react";

export type DashboardHeroAction = {
  label: string;
  href: string;
  icon?: ReactNode;
  primary?: boolean;
};

type DashboardHeroProps = {
  roleLabel: string;
  userName?: string | null;
  welcomeText?: string;
  supportingLine?: string;
  actions?: DashboardHeroAction[];
  trailingAction?: ReactNode;
};

export function DashboardHero({
  roleLabel,
  userName,
  welcomeText = "أهلًا بك",
  supportingLine,
  actions = [],
  trailingAction,
}: DashboardHeroProps) {
  return (
    <section className="rounded-2xl bg-[linear-gradient(135deg,#0F5F7A_0%,#0F7FA8_55%,#16A3C7_100%)] px-4 py-4 text-white shadow-sm sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black text-white/80">{roleLabel}</p>
          <h1 className="mt-1 truncate text-2xl font-black leading-tight">
            {welcomeText} {userName || "المستخدم"}
          </h1>
          {supportingLine ? (
            <p className="mt-1 max-w-2xl text-xs font-bold text-white/80">
              {supportingLine}
            </p>
          ) : null}
        </div>

        {actions.length > 0 || trailingAction ? (
          <div className="flex flex-wrap gap-2">
            {actions.slice(0, 2).map((action) => (
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href}
                className={[
                  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                  action.primary
                    ? "bg-white text-[#0F5F7A] hover:bg-sky-50"
                    : "border border-white/35 bg-white/10 text-white hover:bg-white/20",
                ].join(" ")}
              >
                {action.icon}
                {action.label}
              </Link>
            ))}
            {trailingAction}
          </div>
        ) : null}
      </div>
    </section>
  );
}
