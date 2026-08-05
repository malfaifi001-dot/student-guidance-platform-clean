import styles from "./portfolio-cover-official-logos.module.css";

type PortfolioCoverOfficialLogosProps = {
  ministryLogoSrc: string;
  visionLogoSrc: string;
  tone: "light" | "dark";
  className?: string;
};

export function PortfolioCoverOfficialLogos({
  ministryLogoSrc,
  visionLogoSrc,
  tone,
  className = "",
}: PortfolioCoverOfficialLogosProps) {
  return (
    <div
      className={[
        styles.wrapper,
        tone === "dark" ? styles.dark : styles.light,
        "portfolio-cover-official-logos",
        `portfolio-cover-official-logos-${tone}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <img
        className={`${styles.logo} ${styles.ministryLogo} portfolio-cover-logo portfolio-cover-logo-ministry`}
        src={ministryLogoSrc}
        alt="شعار وزارة التعليم"
      />
      <span
        className={`${styles.divider} portfolio-cover-logo-divider`}
        aria-hidden="true"
      />
      <img
        className={`${styles.logo} ${styles.visionLogo} portfolio-cover-logo portfolio-cover-logo-vision`}
        src={visionLogoSrc}
        alt="شعار رؤية المملكة العربية السعودية 2030"
      />
    </div>
  );
}
