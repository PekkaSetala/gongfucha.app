import type { MetadataRoute } from "next";
import { getAllEntries } from "@/data/corpus";
import { PUBLIC_CATEGORY_SLUGS } from "@/data/corpus/category-slugs";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://gongfucha.app").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const entries = getAllEntries();
  const now = new Date();

  // Note: /corpus is intentionally omitted until the open-source repo
  // github.com/PekkaSetala/gongfucha-corpus exists. Adding it before the
  // repo is live would surface a Dataset JSON-LD distribution URL that 404s.
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/brewing`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/teas`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/about/methodology`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    ...PUBLIC_CATEGORY_SLUGS.map((slug) => ({
      url: `${BASE}/category/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...entries.map((e) => ({
      url: `${BASE}/tea/${e.id}`,
      lastModified: new Date(e.updated),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
