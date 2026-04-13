import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology — Gongfu Cha",
  description:
    "How the gongfucha.app corpus, RAG pipeline, and sources work. Written by Pekka Setälä, a solo developer and hobbyist gongfu tea drinker in Finland.",
  alternates: {
    canonical: "/about/methodology",
  },
  openGraph: {
    title: "Methodology — Gongfu Cha",
    description:
      "How the gongfucha.app corpus, RAG pipeline, and sources work.",
    type: "article",
    url: "/about/methodology",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Methodology — Gongfu Cha",
    description:
      "How the gongfucha.app corpus, RAG pipeline, and sources work.",
    images: ["/og-image.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://gongfucha.app/about/methodology#article",
      headline: "Methodology",
      description:
        "How the gongfucha.app corpus, RAG pipeline, and sources work.",
      inLanguage: "en",
      datePublished: "2026-04-14",
      dateModified: "2026-04-14",
      author: { "@id": "https://gongfucha.app/about/methodology#author" },
      mainEntityOfPage: "https://gongfucha.app/about/methodology",
    },
    {
      "@type": "Person",
      "@id": "https://gongfucha.app/about/methodology#author",
      name: "Pekka Setälä",
      url: "https://pekkasetala.github.io",
      sameAs: [
        "https://pekkasetala.github.io",
        "https://github.com/PekkaSetala",
      ],
      jobTitle: "Software developer",
      nationality: "Finnish",
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://gongfucha.app/about/methodology#breadcrumbs",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://gongfucha.app/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "About",
          item: "https://gongfucha.app/about",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Methodology",
          item: "https://gongfucha.app/about/methodology",
        },
      ],
    },
  ],
};

export default function MethodologyPage() {
  return (
    <main
      id="main-content"
      className="bg-bg text-primary min-h-screen px-5 py-12 sm:py-16"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-[680px]">
        <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-10">
          Methodology
        </h1>

        <section className="mb-10">
          <h2
            id="author"
            className="text-xl font-medium mb-3 scroll-mt-24"
          >
            Who built this
          </h2>
          <p className="text-secondary leading-relaxed">
            I&apos;m Pekka Setälä, a solo developer in Finland and a hobbyist
            gongfu tea drinker. I built gongfucha.app by myself, on nights and
            weekends, because the tools I wanted didn&apos;t exist the way I
            wanted them. More about me at{" "}
            <a
              href="https://pekkasetala.github.io"
              className="text-clay underline decoration-clay/40 underline-offset-2 hover:decoration-clay"
            >
              pekkasetala.github.io
            </a>{" "}
            and{" "}
            <a
              href="https://github.com/PekkaSetala"
              className="text-clay underline decoration-clay/40 underline-offset-2 hover:decoration-clay"
            >
              github.com/PekkaSetala
            </a>
            .
          </p>
        </section>

        <section className="mb-10">
          <h2
            id="corpus"
            className="text-xl font-medium mb-3 scroll-mt-24"
          >
            The corpus
          </h2>
          <p className="text-secondary leading-relaxed">
            The app is backed by 84 hand-curated tea entries: greens, whites,
            yellows, oolongs, red (black) teas, sheng and shou puerh, and hei
            cha. Each entry carries origin, terroir, cultivar, processing,
            oxidation and roast level, flavor profile, firsthand tasting notes
            where I have them, and a full gongfu brewing schedule (temperature,
            leaf ratio, per-infusion times, rinse behavior). The corpus is
            released under CC-BY-4.0 at{" "}
            <a
              href="https://github.com/PekkaSetala/gongfucha-corpus"
              className="text-clay underline decoration-clay/40 underline-offset-2 hover:decoration-clay"
            >
              github.com/PekkaSetala/gongfucha-corpus
            </a>
            . If that link 404s, the repo is still being separated from the app
            repo — check back shortly.
          </p>
        </section>

        <section className="mb-10">
          <h2
            id="rag"
            className="text-xl font-medium mb-3 scroll-mt-24"
          >
            How retrieval works
          </h2>
          <p className="text-secondary leading-relaxed mb-3">
            When you describe a tea in free text, the app embeds your query
            with a local{" "}
            <code className="text-sm bg-surface px-1.5 py-0.5 rounded border border-border">
              all-MiniLM-L6-v2
            </code>{" "}
            model, runs a hybrid search against Qdrant (name and alias boost
            plus cosine similarity over the embedded entries), and returns the
            closest match above a confidence threshold. If nothing clears the
            threshold, it falls back to an LLM call through OpenRouter,
            grounded in the top retrieved entries.
          </p>
          <p className="text-secondary leading-relaxed">
            There is no LangChain or LlamaIndex here. The pipeline is built
            from primitives — embedding, vector store, retrieval, prompt
            augmentation — because this is both a portfolio project and a
            practical tool, and the honest answer is that both matter. I
            wanted to understand the mechanics, not wire together a framework.
          </p>
        </section>

        <section className="mb-10">
          <h2
            id="sources"
            className="text-xl font-medium mb-3 scroll-mt-24"
          >
            Sources
          </h2>
          <p className="text-secondary leading-relaxed">
            Entries cite their sources. Most of the information is drawn from
            vendor catalogs and tea-writing sites that I read regularly:{" "}
            <a href="https://verdanttea.com" className="text-clay underline decoration-clay/40 underline-offset-2 hover:decoration-clay">Verdant Tea</a>,{" "}
            <a href="https://yunnansourcing.com" className="text-clay underline decoration-clay/40 underline-offset-2 hover:decoration-clay">Yunnan Sourcing</a>,{" "}
            <a href="https://sevencups.com" className="text-clay underline decoration-clay/40 underline-offset-2 hover:decoration-clay">Seven Cups</a>,{" "}
            <a href="https://white2tea.com" className="text-clay underline decoration-clay/40 underline-offset-2 hover:decoration-clay">White2Tea</a>,{" "}
            <a href="https://pathofcha.com" className="text-clay underline decoration-clay/40 underline-offset-2 hover:decoration-clay">Path of Cha</a>,{" "}
            <a href="https://teadb.org" className="text-clay underline decoration-clay/40 underline-offset-2 hover:decoration-clay">TeaDB</a>, and{" "}
            <a href="https://meileaf.com" className="text-clay underline decoration-clay/40 underline-offset-2 hover:decoration-clay">Mei Leaf</a>.
            Where I&apos;ve drunk the tea myself, the tasting notes are mine
            and the vendor copy is cross-checked, not quoted.
          </p>
        </section>

        <section className="mb-10">
          <h2
            id="updates"
            className="text-xl font-medium mb-3 scroll-mt-24"
          >
            Updates
          </h2>
          <p className="text-secondary leading-relaxed">
            The corpus updates occasionally, as sources improve or as I drink
            and learn more. There is no schedule. If something is wrong, it
            gets fixed when I notice or when someone tells me.
          </p>
        </section>

        <section className="mb-10">
          <h2
            id="corrections"
            className="text-xl font-medium mb-3 scroll-mt-24"
          >
            Corrections
          </h2>
          <p className="text-secondary leading-relaxed">
            Found a factual error, a mistranslated cultivar name, a brewing
            schedule that&apos;s plainly wrong? Open an issue on the corpus
            repo at{" "}
            <a
              href="https://github.com/PekkaSetala/gongfucha-corpus/issues"
              className="text-clay underline decoration-clay/40 underline-offset-2 hover:decoration-clay"
            >
              github.com/PekkaSetala/gongfucha-corpus/issues
            </a>
            . There is no contact form on the site on purpose.
          </p>
        </section>

        <p className="text-secondary leading-relaxed border-t border-border pt-6 mt-12">
          Most tea sites are vendors or aggregators. This one is a hobbyist
          writing down what the tea actually tastes like.
        </p>
      </article>
    </main>
  );
}
