import type { Metadata } from "next";
import Link from "next/link";
import { getAllEntries } from "@/data/corpus";
import {
  CATEGORY_SLUG_TO_CORPUS,
  CATEGORY_LABELS,
  PUBLIC_CATEGORY_SLUGS,
} from "@/data/corpus/category-slugs";
import { buildBreadcrumbs } from "@/lib/jsonld";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://gongfucha.app").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "All teas — Gongfu Cha",
  description:
    "Eighty-four hand-curated Chinese teas with brewing parameters, tasting notes, and provenance — green, white, yellow, oolong, black, and pu-erh.",
  alternates: { canonical: "/teas" },
  openGraph: {
    title: "All teas — Gongfu Cha",
    description:
      "Eighty-four hand-curated Chinese teas with brewing parameters, tasting notes, and provenance.",
    type: "website",
    url: `${SITE_URL}/teas`,
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]+[.!?]/);
  return (m ? m[0] : text).trim();
}

export default function TeasIndexPage() {
  const all = getAllEntries();
  const grouped = PUBLIC_CATEGORY_SLUGS.map((slug) => ({
    slug,
    label: CATEGORY_LABELS[slug],
    teas: all.filter((e) => e.category === CATEGORY_SLUG_TO_CORPUS[slug]),
  })).filter((g) => g.teas.length > 0);

  const breadcrumbs = buildBreadcrumbs([
    { name: "Home", url: "/" },
    { name: "Teas", url: "/teas" },
  ]);

  return (
    <main id="main-content" className="flex-1 bg-bg text-primary px-5 py-10 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <article className="mx-auto max-w-[680px]">
        <header className="mb-8">
          <h1 className="font-serif-cn text-3xl sm:text-4xl font-bold leading-tight text-primary">
            All teas
          </h1>
          <p className="mt-2 text-sm text-secondary">
            {all.length} hand-curated Chinese teas, grouped by category.
          </p>
        </header>

        {grouped.map((g) => (
          <section key={g.slug} className="mb-10">
            <h2 className="font-serif-cn text-2xl font-bold text-primary mb-4">
              <Link href={`/category/${g.slug}`} className="hover:underline">
                {g.label}
              </Link>
              <span className="ml-2 text-sm font-normal text-secondary">({g.teas.length})</span>
            </h2>
            <ul className="space-y-3">
              {g.teas.map((t) => (
                <li
                  key={t.id}
                  className="rounded-2xl bg-surface border border-border p-4 hover:border-primary"
                >
                  <Link href={`/tea/${t.id}`} className="block">
                    <div className="font-serif-cn text-lg font-bold text-primary">{t.name}</div>
                    <div className="text-xs text-secondary mt-0.5">{t.region}</div>
                    <p className="text-sm text-primary mt-2 leading-relaxed">
                      {firstSentence(t.flavor_profile)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mb-10 text-sm text-secondary">
          New to gongfu brewing?{" "}
          <Link href="/brewing" className="underline text-primary">
            Read the brewing guide.
          </Link>
        </section>
      </article>
    </main>
  );
}
