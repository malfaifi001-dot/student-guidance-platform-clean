import type {
  DocumentZoneProps,
} from "../document-layout-types";

export function DocumentContentZone({
  children,
  className = "",
  style,
}: DocumentZoneProps) {
  return (
    <main
      className={[
        "flex min-h-0 flex-1 flex-col",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      data-document-content-zone
    >
      {children}
    </main>
  );
}