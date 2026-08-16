import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { TEACHIX_TAGLINE } from "@/lib/constants/brand";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://teachix.sa"),
  title: {
    default: TEACHIX_TAGLINE,
    template: "%s | Teachix",
  },
  description:
    "Teachix منصة مدرسية رقمية تساعد مدير المدرسة والمعلم والموجه الطلابي ورائد النشاط على إنجاز الأعمال وتوثيقها ومتابعتها وإصدار التقارير من مكان واحد.",
  applicationName: "تيتش اكس",
  openGraph: {
    type: "website",
    locale: "ar_SA",
    url: "https://teachix.sa/",
    siteName: "تيتش اكس",
    title: "Teachix | منصة مدرسية رقمية متكاملة",
    description:
      "منصة مدرسية رقمية تساعد فريق المدرسة على إنجاز الأعمال وتوثيقها ومتابعتها وإصدار التقارير من مكان واحد.",
  },
  twitter: {
    card: "summary",
    title: "Teachix | منصة مدرسية رقمية متكاملة",
    description:
      "منصة مدرسية رقمية تساعد فريق المدرسة على إنجاز الأعمال وتوثيقها ومتابعتها وإصدار التقارير من مكان واحد.",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/brand/teachix-icon.svg",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={cairo.variable}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased transition-colors dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>{children}</ThemeProvider>
      </body>

      <GoogleAnalytics gaId="G-7NPFWYDTJP" />
    </html>
  );
}
