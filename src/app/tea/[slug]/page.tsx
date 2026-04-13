import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllEntries, getEntryById } from "@/data/corpus";
import { CORPUS_TO_CATEGORY_SLUG, CATEGORY_LABELS } from "@/data/corpus/category-slugs";
import { buildTechArticle, buildBreadcrumbs } from "@/lib/jsonld";
import type { TeaEntry } from "@/data/corpus/schema";

export const dynamicParams = false;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://gongfucha.app").replace(/\/$/, "");

export async function generateStaticParams() {
  return getAllEntries().map((e) => ({ slug: e.id }));
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
  const entry = getEntryById(slug);
  if (!entry) return {};

  const description = firstSentence(entry.flavor_profile);
  const url = `/tea/${entry.id}`;

  return {
    title: `${entry.name} — Gongfu Brewing Guide`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${entry.name} — Gongfu Brewing Guide`,
      description,
      type: "article",
      url: `${SITE_URL}${url}`,
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${entry.name} — Gongfu Brewing Guide`,
      description,
      images: ["/og-image.png"],
    },
  };
}

function QuickFacts({ entry }: { entry: TeaEntry }) {
  const rows: Array<[string, string]> = [
    ["Origin", entry.region],
    ["Category", CATEGORY_LABELS[CORPUS_TO_CATEGORY_SLUG[entry.category]]],
    ["Cultivar", entry.cultivar ?? "Various / unspecified"],
    ["Oxidation", entry.oxidation],
    ["Roast", entry.roast ?? "None"],
    ["Water temp", `${entry.brewing.temp_c}°C`],
    ["Leaf ratio", `${entry.brewing.ratio_g_per_100ml}g / 100ml`],
    ["Infusions", `up to ${entry.brewing.max_infusions}`],
    ["Rinse", entry.brewing.rinse ? "Yes" : "No"],
  ];

  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-secondary">{k}</dt>
          <dd className="text-primary">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Lede({ entry }: { entry: TeaEntry }) {
  const categoryLabel = CATEGORY_LABELS[CORPUS_TO_CATEGORY_SLUG[entry.category]].toLowerCase();
  const sub = entry.subcategory ? `${entry.subcategory} ` : "";
  return (
    <p className="text-primary leading-relaxed text-lg">
      {entry.name} is a {sub}
      {categoryLabel} from {entry.region}. Brew it at {entry.brewing.temp_c}°C with{" "}
      {entry.brewing.ratio_g_per_100ml}g of leaf per 100ml of water; expect up to{" "}
      {entry.brewing.max_infusions} short infusions in a small gaiwan or teapot.{" "}
      {entry.brewing.rinse ? "A quick rinse is recommended." : "No rinse needed."}
    </p>
  );
}

function ChipCloud({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((it) => (
        <li
          key={it}
          className="inline-block rounded-full border border-border bg-surface px-3 py-1 text-xs text-primary"
        >
          {it}
        </li>
      ))}
    </ul>
  );
}

export default async function TeaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getEntryById(slug);
  if (!entry) notFound();

  const categorySlug = CORPUS_TO_CATEGORY_SLUG[entry.category];
  const categoryLabel = CATEGORY_LABELS[categorySlug];
  const url = `/tea/${entry.id}`;

  const techArticle = buildTechArticle(entry);
  const breadcrumbs = buildBreadcrumbs([
    { name: "Home", url: "/" },
    { name: "Teas", url: "/teas" },
    { name: categoryLabel, url: `/category/${categorySlug}` },
    { name: entry.name, url },
  ]);

  const hanzi = entry.aliases.find((a) => /[\u4e00-\u9fff]/.test(a));

  return (
    <main id="main-content" className="flex-1 bg-bg text-primary px-5 py-10 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([techArticle, breadcrumbs]) }}
      />
      <article className="mx-auto max-w-[680px]">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-secondary">
          <Link href="/teas" className="hover:text-primary">
            Teas
          </Link>
          <span className="mx-2">/</span>
          <Link href={`/category/${categorySlug}`} className="hover:text-primary">
            {categoryLabel}
          </Link>
        </nav>

        <header className="mb-8">
          <h1 className="font-serif-cn text-3xl sm:text-4xl font-bold leading-tight text-primary">
            {entry.name}
            {hanzi && (
              <span lang="zh-Hans" className="ml-3 text-2xl text-secondary font-normal">
                {hanzi}
              </span>
            )}
          </h1>
          <p className="mt-2 text-sm text-secondary">
            {entry.subcategory ? `${entry.subcategory} · ` : ""}
            {entry.region}
          </p>
        </header>

        <section className="mb-8">
          <Lede entry={entry} />
        </section>

        <section id="quick-facts" className="mb-10 rounded-2xl bg-surface border border-border p-5">
          <h2 className="font-serif-cn text-lg font-bold text-primary mb-4">Quick facts</h2>
          <QuickFacts entry={entry} />
        </section>

        <section id="tasting" className="mb-10">
          <h2 className="font-serif-cn text-2xl font-bold text-primary mb-3">Tasting notes</h2>
          <p className="text-primary leading-relaxed whitespace-pre-line">{entry.tasting_notes}</p>
        </section>

        <section id="flavor" className="mb-10">
          <h2 className="font-serif-cn text-2xl font-bold text-primary mb-3">Flavor profile</h2>
          <p className="text-primary leading-relaxed">{entry.flavor_profile}</p>
        </section>

        {(entry.terroir || entry.cultivar) && (
          <section id="terroir" className="mb-10">
            <h2 className="font-serif-cn text-2xl font-bold text-primary mb-3">Terroir</h2>
            {entry.terroir && (
              <p className="text-primary leading-relaxed mb-3">{entry.terroir}</p>
            )}
            {entry.cultivar && (
              <p className="text-secondary text-sm">
                <span className="text-primary">Cultivar:</span> {entry.cultivar}
              </p>
            )}
          </section>
        )}

        <section id="brewing" className="mb-10">
          <h2 className="font-serif-cn text-2xl font-bold text-primary mb-3">Brewing</h2>
          {entry.brewing.rinse && entry.brewing.rinse_hint && (
            <p className="text-primary leading-relaxed mb-4">
              <span className="font-medium">Rinse:</span> {entry.brewing.rinse_hint}
            </p>
          )}
          <ol className="list-decimal pl-5 space-y-1 text-primary">
            {entry.brewing.rinse && <li>Quick rinse — pour off immediately.</li>}
            {entry.brewing.schedule_s.map((s, i) => (
              <li key={i}>
                Steep {i + 1}: {s} seconds
              </li>
            ))}
          </ol>
          {entry.brewing.tips && (
            <p className="mt-4 text-secondary text-sm leading-relaxed">{entry.brewing.tips}</p>
          )}
        </section>

        {(entry.aroma_notes.length > 0 || entry.taste_notes.length > 0) && (
          <section id="aroma" className="mb-10">
            <h2 className="font-serif-cn text-2xl font-bold text-primary mb-3">Aroma & taste</h2>
            {entry.aroma_notes.length > 0 && (
              <div className="mb-4">
                <p className="text-secondary text-xs mb-2">Aroma</p>
                <ChipCloud items={entry.aroma_notes} />
              </div>
            )}
            {entry.taste_notes.length > 0 && (
              <div>
                <p className="text-secondary text-xs mb-2">Taste</p>
                <ChipCloud items={entry.taste_notes} />
              </div>
            )}
          </section>
        )}

        {entry.processing.length > 0 && (
          <section id="processing" className="mb-10">
            <h2 className="font-serif-cn text-2xl font-bold text-primary mb-3">Processing</h2>
            <ul className="list-disc pl-5 text-primary space-y-1">
              {entry.processing.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="mb-10">
          <a
            href={`/?brew=${entry.id}`}
            className="inline-block rounded-full bg-primary text-bg px-6 py-3 font-medium hover:opacity-90"
          >
            Start brewing {entry.name}
          </a>
        </section>

        {entry.sources.length > 0 && (
          <section id="sources" className="mb-10">
            <h2 className="font-serif-cn text-2xl font-bold text-primary mb-3">Sources</h2>
            <ul className="list-disc pl-5 text-secondary text-sm space-y-1">
              {entry.sources.map((s) => (
                <li key={s}>
                  <a
                    href={s}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary break-all"
                  >
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </main>
  );
}
