export const PORTFOLIO_THEME_IDS = [
  "ministry-elegant",
] as const;

export type PortfolioThemeId = (typeof PORTFOLIO_THEME_IDS)[number];

export type PortfolioThemeDefinition = {
  id: PortfolioThemeId;
  name: string;
  shortDescription: string;
  previewClass: "preview-ministry";
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
];

export const DEFAULT_PORTFOLIO_THEME_ID: PortfolioThemeId = "ministry-elegant";

export function isPortfolioThemeId(value: unknown): value is PortfolioThemeId {
  return value === DEFAULT_PORTFOLIO_THEME_ID;
}

export function getPortfolioTheme(themeId?: string | null): PortfolioThemeDefinition {
  return PORTFOLIO_THEMES.find((item) => item.id === themeId) || PORTFOLIO_THEMES[0];
}
