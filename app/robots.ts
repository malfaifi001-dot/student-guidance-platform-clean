import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about", "/features", "/services", "/contact", "/privacy", "/terms"],
      disallow: [
        "/dashboard/",
        "/mobile/",
        "/mobile-preview/",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/pricing",
        "/print/",
        "/pdf-preview/",
        "/report-2-export-preview/",
        "/school-signature/",
        "/survey/",
        "/teacher/",
        "/api/",
      ],
    },
    sitemap: "https://teachix.sa/sitemap.xml",
    host: "https://teachix.sa",
  };
}
