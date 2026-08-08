export type ReportDesignId =
  | "ministry-form"
  | "modern-official"
  | "evidence-showcase"
  | "formal-memo"
  | "counseling-case-file"
  | "behavior-followup"
  | "program-impact"
  | "girls-rose-official"
  | "girls-lilac-elegant"
  | "girls-pearl-calm"
  | "report-official-archive"
  | "report-playful-cards"
  | "report-calm-reader"
  | "ministry-elegant"
  | "moe-official-2024"
  | "editorial-atlas"
  | "geometric-horizon"
  | "moe-classic-frame";

export type ReportDesignDefinition = {
  id: ReportDesignId;
  name: string;
  description: string;
  badge: string;
  cardClass: string;
  activeCardClass: string;
};