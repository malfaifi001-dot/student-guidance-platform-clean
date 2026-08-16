import type { ReactNode } from "react";

export function MobileFieldShell({
  label,
  required = false,
  helperText,
  errorText,
  children,
}: {
  label: string;
  required?: boolean;
  helperText?: string;
  errorText?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-medium text-slate-800">
        {label}
        {required ? <span className="mr-1 text-red-600" aria-hidden="true">*</span> : null}
      </span>
      {children}
      {errorText ? (
        <span className="block text-xs leading-5 text-red-700" role="alert">{errorText}</span>
      ) : helperText ? (
        <span className="block text-xs leading-5 text-slate-500">{helperText}</span>
      ) : null}
    </label>
  );
}
