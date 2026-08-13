import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://teachix.sa",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://teachix.sa/about",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://teachix.sa/features",
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: "https://teachix.sa/services",
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: "https://teachix.sa/contact",
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: "https://teachix.sa/privacy",
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: "https://teachix.sa/terms",
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
