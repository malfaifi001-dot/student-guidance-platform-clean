import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
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
    default: "تيتشكس | الأسرع والأشمل",
    template: "%s | Teachix",
  },
  description:
    "Teachix منصة مدرسية رقمية تساعد مدير المدرسة والمعلم والموجه الطلابي ورائد النشاط على إنجاز الأعمال وتوثيقها ومتابعتها وإصدار التقارير من مكان واحد.",
  applicationName: "Teachix",
  openGraph: {
    type: "website",
    locale: "ar_SA",
    url: "https://teachix.sa/",
    siteName: "Teachix",
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
    icon: "/brand/teachix-icon.svg",
    shortcut: "/brand/teachix-icon.svg",
    apple: "/brand/teachix-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased transition-colors dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
