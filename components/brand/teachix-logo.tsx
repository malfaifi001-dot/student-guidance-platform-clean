type TeachixLogoProps = {
  iconOnly?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function TeachixLogo({
  iconOnly = false,
  size = "md",
  className = "",
}: TeachixLogoProps) {
  const icon = (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className={[
        "block aspect-square h-auto shrink-0 text-sky-600",
        iconOnly ? className : size === "sm" ? "w-5" : "w-9",
      ].join(" ")}
    >
      <circle cx="9" cy="9" r="9" fill="currentColor" />
      <circle cx="9" cy="9" r="6.42857" fill="white" />
      <circle cx="9" cy="9" r="4.71429" fill="currentColor" />
      <circle cx="9" cy="9" r="2.14286" fill="white" />
    </svg>
  );

  if (iconOnly) return icon;

  return (
    <span
      className={[
        "inline-flex items-center gap-2.5 whitespace-nowrap",
        className,
      ].join(" ")}
      aria-label="تيتشكس"
    >
      {icon}
      <span
        className={[
          "font-sans font-bold tracking-tight text-slate-950 dark:text-white",
          size === "sm" ? "text-sm" : "text-xl",
        ].join(" ")}
      >
        تيتشكس
      </span>
    </span>
  );
}
