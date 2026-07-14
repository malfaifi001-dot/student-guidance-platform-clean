export type PortfolioThemeDefinition = {
  id: string;
  name: string;
  description: string;
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
    name: "رسمي أنيق",
    description: "تصميم تركواز وكحلي مستوحى من الهوية التعليمية، مناسب للطباعة الرسمية.",
    palette: {
      primary: "#0f766e",
      secondary: "#0f2a4d",
      accent: "#22c55e",
      muted: "#eef7f6",
    },
  },
];

export const DEFAULT_PORTFOLIO_THEME_ID = "ministry-elegant";

export function getPortfolioTheme(themeId?: string | null) {
  return (
    PORTFOLIO_THEMES.find((theme) => theme.id === themeId) ||
    PORTFOLIO_THEMES[0]
  );
}