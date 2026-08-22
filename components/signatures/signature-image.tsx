import { useId, type CSSProperties } from "react";

const DEFAULT_SIGNATURE_STROKE_BOOST = 2;

type SignatureImageProps = {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  maxWidth?: string;
  maxHeight?: string;
  strokeBoost?: number;
};

/**
 * Shared, layout-neutral signature renderer. Consumers own the frame size;
 * this component only guarantees proportional, centered, non-clipped output.
 */
export function SignatureImage({
  src,
  alt,
  className,
  style,
  maxWidth = "100%",
  maxHeight,
  strokeBoost = DEFAULT_SIGNATURE_STROKE_BOOST,
}: SignatureImageProps) {
  const rawId = useId();
  const filterId = `teachix-signature-boost-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const safeBoost = Number.isFinite(strokeBoost)
    ? Math.min(3, Math.max(1, strokeBoost))
    : DEFAULT_SIGNATURE_STROKE_BOOST;
  const radius = Math.min(1.7, Math.max(0, (safeBoost - 1) * 0.85));

  return (
    <>
      {safeBoost > 1 ? (
        <svg
          aria-hidden="true"
          focusable="false"
          width="0"
          height="0"
          style={{ position: "absolute", width: 0, height: 0, overflow: "visible" }}
        >
          <defs>
            <filter
              id={filterId}
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
              colorInterpolationFilters="sRGB"
            >
              <feMorphology
                in="SourceGraphic"
                operator="dilate"
                radius={radius}
                result="expandedSignature"
              />
              <feBlend
                in="expandedSignature"
                in2="SourceGraphic"
                mode="normal"
              />
            </filter>
          </defs>
        </svg>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={className}
        style={{
          display: "block",
          width: "auto",
          maxWidth,
          maxHeight,
          objectFit: "contain",
          objectPosition: "center",
          mixBlendMode: "normal",
          filter: safeBoost > 1 ? `url(#${filterId})` : undefined,
          ...style,
        }}
      />
    </>
  );
}
