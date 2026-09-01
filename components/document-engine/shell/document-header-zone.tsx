import type {
  DocumentZoneProps,
} from "../document-layout-types";

export function DocumentHeaderZone({
  children,
  className = "",
  style,
}: DocumentZoneProps) {
  if (!children) {
    return null;
  }

  return (
    <header
      className={[
        "shrink-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      data-document-header-zone
    >
      {children}
    </header>
  );
}