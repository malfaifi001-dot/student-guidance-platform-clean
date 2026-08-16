import Link from "next/link";
import type { ReactNode } from "react";

type BaseProps = {
  title: string;
  description?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

export function MobileListRow({
  href,
  onClick,
  ...props
}: BaseProps & { href?: string; onClick?: () => void }) {
  const className = `flex min-h-14 w-full items-center gap-3 border-b border-slate-200 py-3 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3478B8] ${props.className ?? ""}`;
  const content = (
    <>
      {props.leading ? <span className="shrink-0 text-slate-500" aria-hidden="true">{props.leading}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-900">{props.title}</span>
        {props.description ? <span className="mt-1 block text-xs leading-5 text-slate-500">{props.description}</span> : null}
      </span>
      {props.trailing ? <span className="shrink-0 text-slate-500">{props.trailing}</span> : null}
    </>
  );

  if (href) return <Link href={href} className={className}>{content}</Link>;
  return <button type="button" onClick={onClick} className={className}>{content}</button>;
}
