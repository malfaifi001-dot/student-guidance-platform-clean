import type {
  DocumentZoneProps,
} from "../document-layout-types";

export function DocumentFooterZone({
  children,
  className = "",
  style,
}: DocumentZoneProps) {
  if (!children) {
    return null;
  }

  return (
    <footer
      className={[
        "shrink-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      data-document-footer-zone
    >
      {children}
    </footer>
  );
}