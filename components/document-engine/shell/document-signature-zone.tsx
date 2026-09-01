import type {
  DocumentSignatureZoneProps,
} from "../document-layout-types";

const ALIGNMENT_CLASSES = {
  start:
    "items-start",

  center:
    "items-center",

  end:
    "items-end",

  stretch:
    "items-stretch",
} as const;

export function DocumentSignatureZone({
  children,
  className = "",
  style,
  align = "stretch",
}: DocumentSignatureZoneProps) {
  if (!children) {
    return null;
  }

  return (
    <section
      className={[
        "mt-auto flex shrink-0 flex-col",
        ALIGNMENT_CLASSES[align],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      data-document-signature-zone
    >
      {children}
    </section>
  );
}