export const PORTFOLIO_THEME_IDS = [
  "ministry-elegant",
  "moe-official-2024",
] as const;

export type PortfolioThemeId = (typeof PORTFOLIO_THEME_IDS)[number];

export type PortfolioThemeDefinition = {
  id: PortfolioThemeId;
  name: string;
  shortDescription: string;
  previewClass: "preview-ministry" | "preview-moe-official-2024";
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    muted: string;
  };
};

export const PORTFOLIO_THEMES: PortfolioThemeDefinition[] = [
  {
    id: "ministry-elegant",
    name: "الوزاري الأنيق",
    shortDescription: "هوية تعليمية رسمية بإطار متوازن وزوايا هندسية هادئة.",
    previewClass: "preview-ministry",
    palette: {
      primary: "#0f766e",
      secondary: "#0f2a4d",
      accent: "#22c55e",
      muted: "#eef7f6",
    },
  },
  {
    id: "moe-official-2024",
    name: "الهوية الرسمية 2024",
    shortDescription: "تصميم مستقل مستوحى من دليل الهوية البصرية لوزارة التعليم 2024.",
    previewClass: "preview-moe-official-2024",
    palette: {
      primary: "#15445A",
      secondary: "#07A869",
      accent: "#0DA9A6",
      muted: "#F5F7F6",
    },
  },
];

export const DEFAULT_PORTFOLIO_THEME_ID: PortfolioThemeId = "ministry-elegant";

export function isPortfolioThemeId(value: unknown): value is PortfolioThemeId {
  return typeof value === "string" && (PORTFOLIO_THEME_IDS as readonly string[]).includes(value);
}

export function getPortfolioTheme(themeId?: string | null): PortfolioThemeDefinition {
  return PORTFOLIO_THEMES.find((item) => item.id === themeId) || PORTFOLIO_THEMES[0];
}
