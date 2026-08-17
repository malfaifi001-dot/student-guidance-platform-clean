import type { CSSProperties } from "react";

export const MOBILE_LAYER_Z_INDEX = {
  navigation: "z-40",
  overlay: "z-[60]",
  modal: "z-[70]",
  feedback: "z-[80]",
} as const;

export const MOBILE_BOTTOM_CLEARANCE_CLASS =
  "pb-[var(--mobile-bottom-clearance)]";

export const MOBILE_LAYER_STYLE: CSSProperties & Record<
  | "--mobile-bottom-nav-height"
  | "--mobile-bottom-nav-offset"
  | "--mobile-bottom-safe-area"
  | "--mobile-bottom-clearance",
  string
> = {
  "--mobile-bottom-nav-height": "5.5rem",
  "--mobile-bottom-nav-offset": "0.75rem",
  "--mobile-bottom-safe-area": "env(safe-area-inset-bottom)",
  "--mobile-bottom-clearance":
    "calc(var(--mobile-bottom-nav-height) + var(--mobile-bottom-nav-offset) + var(--mobile-bottom-safe-area) + 1rem)",
};
