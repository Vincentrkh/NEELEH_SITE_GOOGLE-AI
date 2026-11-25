import type { MetadataRoute } from "next";

function normalizeBaseUrl(raw: string | undefined): string {
  const trimmed = (raw || "http://localhost:3000").trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.toLowerCase()}`;
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL);
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/dashboard", "/panel/", "/panel", "/login/", "/login", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
