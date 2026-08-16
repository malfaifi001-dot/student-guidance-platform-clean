import type { ReactNode } from "react";

export function MobileSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-6 first:mt-0">
      {title ? <h2 className="mb-3 text-base font-semibold text-slate-900">{title}</h2> : null}
      {children}
    </section>
  );
}
