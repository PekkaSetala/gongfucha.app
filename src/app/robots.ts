import type { MetadataRoute } from "next";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://gongfucha.app").replace(/\/$/, "");
const IS_PROD = process.env.NODE_ENV === "production";

export default function robots(): MetadataRoute.Robots {
  if (!IS_PROD) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
