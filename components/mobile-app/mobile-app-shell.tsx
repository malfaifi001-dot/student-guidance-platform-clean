import type { ReactNode } from "react";
import { MOBILE_BOTTOM_CLEARANCE_CLASS, MOBILE_LAYER_STYLE } from "./mobile-layer-contract";

export function MobileAppShell({
  children,
  bottomNavigation,
}: {
  children: ReactNode;
  bottomNavigation?: ReactNode;
}) {
  const hasBottomNavigation = Boolean(bottomNavigation);

  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] overflow-x-hidden bg-white text-slate-950"
      style={{
        ...MOBILE_LAYER_STYLE,
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <main
        className={`mx-auto min-h-[100dvh] w-full max-w-md px-5 pt-5 ${
          hasBottomNavigation
          ? MOBILE_BOTTOM_CLEARANCE_CLASS
            : "pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        }`}
      >
        {children}
      </main>
      {bottomNavigation}
    </div>
  );
}
