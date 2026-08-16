import type { ButtonHTMLAttributes } from "react";

export function MobilePrimaryButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`min-h-12 w-full rounded-xl bg-[#3478B8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2D6BA5] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3478B8] focus-visible:ring-offset-2 ${className}`}
    />
  );
}
