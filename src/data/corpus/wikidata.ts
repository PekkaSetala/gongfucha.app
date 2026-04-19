/** Manually verified Wikidata URLs for corpus entries.
 *  Sparse by design — honesty over coverage. Entries not listed have
 *  no sameAs on their tea page. */
const WIKIDATA_BY_ID: Record<string, string> = {
  "da-hong-pao": "https://www.wikidata.org/wiki/Q1158013",
  "long-jing": "https://www.wikidata.org/wiki/Q1064948",
  "tie-guan-yin": "https://www.wikidata.org/wiki/Q716613",
  "sheng-pu-erh": "https://www.wikidata.org/wiki/Q190510",
  "shou-pu-erh": "https://www.wikidata.org/wiki/Q190510",
};

export function getWikidataUrl(id: string): string | undefined {
  return WIKIDATA_BY_ID[id];
}
