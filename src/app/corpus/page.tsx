// TODO(seo): Do NOT link from sitemap or layout until the open-source
// repo at github.com/PekkaSetala/gongfucha-corpus is live and reachable.
// Until then, the Dataset JSON-LD distribution URL would 404 and tank the
// dataset signal. This page is intentionally returning notFound() to
// keep it out of the indexable surface area.
import { notFound } from "next/navigation";

export const dynamic = "force-static";

export default function CorpusPage() {
  notFound();
}
