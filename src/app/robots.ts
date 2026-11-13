import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://thedropoutcollege.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/staff", "/journal/studio", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
