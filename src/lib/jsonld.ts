import type { TeaEntry } from "@/data/corpus/schema";
import { CORPUS_TO_CATEGORY_SLUG, CATEGORY_LABELS } from "@/data/corpus/category-slugs";
import { getWikidataUrl } from "@/data/corpus/wikidata";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://gongfucha.app").replace(/\/$/, "");

const PERSON = {
  "@type": "Person" as const,
  name: "Pekka Setälä",
  url: `${SITE_URL}/about/methodology`,
  sameAs: [
    "https://pekkasetala.github.io",
    "https://github.com/PekkaSetala",
    "https://tajuste.com",
  ],
};

const ORGANIZATION = {
  "@type": "Organization" as const,
  name: "Gongfu Cha",
  url: SITE_URL,
  founder: PERSON,
};

export function buildPerson() {
  return { "@context": "https://schema.org", ...PERSON };
}

export function buildOrganization() {
  return { "@context": "https://schema.org", ...ORGANIZATION };
}

export function buildWebSite() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Gongfu Cha",
    url: SITE_URL,
    publisher: PERSON,
  };
}

export interface BreadcrumbSegment {
  name: string;
  url: string;
}

export function buildBreadcrumbs(segments: BreadcrumbSegment[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: segments.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.name,
      item: s.url.startsWith("http") ? s.url : `${SITE_URL}${s.url}`,
    })),
  };
}

export interface ArticleInput {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified: string;
}

export function buildArticle({
  headline,
  description,
  url,
  datePublished,
  dateModified,
}: ArticleInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    datePublished,
    dateModified,
    author: PERSON,
    publisher: ORGANIZATION,
    mainEntityOfPage: url.startsWith("http") ? url : `${SITE_URL}${url}`,
  };
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]+[.!?]/);
  return (m ? m[0] : text).trim();
}

export function buildTechArticle(entry: TeaEntry) {
  const url = `${SITE_URL}/tea/${entry.id}`;
  const wikidata = getWikidataUrl(entry.id);
  const about: Record<string, unknown> = {
    "@type": "Thing",
    name: entry.name,
  };
  if (wikidata) about.sameAs = [wikidata];

  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `${entry.name} — Gongfu Brewing Guide`,
    description: firstSentence(entry.flavor_profile),
    datePublished: entry.updated,
    dateModified: entry.updated,
    author: PERSON,
    publisher: ORGANIZATION,
    mainEntityOfPage: url,
    articleSection: CATEGORY_LABELS[CORPUS_TO_CATEGORY_SLUG[entry.category]],
    about,
  };
}

export interface DatasetInput {
  url: string;
  downloadUrl?: string;
  entryCount: number;
}

export function buildDataset({ url, downloadUrl, entryCount }: DatasetInput) {
  const distribution = downloadUrl
    ? [
        {
          "@type": "DataDownload",
          encodingFormat: "application/json",
          contentUrl: downloadUrl,
        },
      ]
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Gongfu Cha Tea Corpus",
    description: `${entryCount} hand-curated Chinese tea entries with brewing parameters, tasting notes, processing details, and provenance sources. Built for a RAG retrieval system at gongfucha.app.`,
    url: url.startsWith("http") ? url : `${SITE_URL}${url}`,
    creator: PERSON,
    publisher: ORGANIZATION,
    license: "https://creativecommons.org/licenses/by/4.0/",
    keywords: [
      "tea",
      "gongfu cha",
      "Chinese tea",
      "tea brewing",
      "tasting notes",
      "RAG",
    ],
    variableMeasured: [
      "name",
      "category",
      "region",
      "cultivar",
      "oxidation",
      "roast",
      "flavor_profile",
      "tasting_notes",
      "brewing.temp_c",
      "brewing.ratio_g_per_100ml",
      "brewing.schedule_s",
    ],
    ...(distribution && { distribution }),
  };
}
