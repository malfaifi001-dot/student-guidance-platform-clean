import type { ReactNode } from "react";

export function MobileEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="py-10 text-center">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {description ? <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">{description}</p> : null}
      {action ? <div className="mx-auto mt-5 max-w-xs">{action}</div> : null}
    </div>
  );
}
