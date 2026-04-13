import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllEntries } from "@/data/corpus";
import {
  CATEGORY_SLUG_TO_CORPUS,
  PUBLIC_CATEGORY_SLUGS,
  CATEGORY_LABELS,
} from "@/data/corpus/category-slugs";
import { CATEGORY_INTROS } from "@/data/category-intros";
import { buildArticle, buildBreadcrumbs } from "@/lib/jsonld";

export const dynamicParams = false;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://gongfucha.app").replace(/\/$/, "");

export async function generateStaticParams() {
  return PUBLIC_CATEGORY_SLUGS.map((slug) => ({ slug }));
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]+[.!?]/);
  return (m ? m[0] : text).trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const corpusCat = CATEGORY_SLUG_TO_CORPUS[slug];
  if (!corpusCat) return {};
  const label = CATEGORY_LABELS[slug];
  const intro = CATEGORY_INTROS[slug];
  return {
    title: `${label} — Gongfu Cha`,
    description: firstSentence(intro),
    alternates: { canonical: `/category/${slug}` },
    openGraph: {
      title: `${label} — Gongfu Cha`,
      description: firstSentence(intro),
      type: "website",
      url: `${SITE_URL}/category/${slug}`,
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const corpusCat = CATEGORY_SLUG_TO_CORPUS[slug];
  if (!corpusCat) notFound();

  const label = CATEGORY_LABELS[slug];
  const intro = CATEGORY_INTROS[slug];
  const teas = getAllEntries().filter((e) => e.category === corpusCat);

  const article = buildArticle({
    headline: `${label} — Gongfu Brewing Guide`,
    description: firstSentence(intro),
    url: `/category/${slug}`,
    datePublished: "2026-04-14",
    dateModified: "2026-04-14",
  });
  const breadcrumbs = buildBreadcrumbs([
    { name: "Home", url: "/" },
    { name: "Teas", url: "/teas" },
    { name: label, url: `/category/${slug}` },
  ]);
  const collectionPage = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${label} — Gongfu Cha`,
    url: `${SITE_URL}/category/${slug}`,
    hasPart: teas.map((t) => ({
      "@type": "TechArticle",
      name: t.name,
      url: `${SITE_URL}/tea/${t.id}`,
    })),
  };

  return (
    <main id="main-content" className="flex-1 bg-bg text-primary px-5 py-10 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([article, breadcrumbs, collectionPage]),
        }}
      />
      <article className="mx-auto max-w-[680px]">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-secondary">
          <Link href="/teas" className="hover:text-primary">
            Teas
          </Link>
        </nav>
        <header className="mb-8">
          <h1 className="font-serif-cn text-3xl sm:text-4xl font-bold leading-tight text-primary">
            {label}
          </h1>
          <p className="mt-2 text-sm text-secondary">{teas.length} teas in this category</p>
        </header>

        <section className="mb-10">
          <p className="text-primary leading-relaxed whitespace-pre-line">{intro}</p>
        </section>

        <section className="mb-10">
          <h2 className="font-serif-cn text-2xl font-bold text-primary mb-4">
            Teas in this category
          </h2>
          <ul className="space-y-3">
            {teas.map((t) => (
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
