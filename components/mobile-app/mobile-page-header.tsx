import type { ReactNode } from "react";
import Link from "next/link";

export function MobilePageHeader({
  title,
  description,
  backHref,
  action,
}: {
  title: string;
  description: string;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <header className="border-b border-slate-200 pb-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {backHref ? (
            <Link
              href={backHref}
              className="mb-3 inline-flex min-h-11 items-center text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3478B8] focus-visible:ring-offset-2"
            >
              رجوع
            </Link>
          ) : null}
          <h1 className="text-xl font-semibold tracking-tight text-slate-950">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}
