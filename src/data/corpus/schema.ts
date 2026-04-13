/** Corpus entry schema for the gongfu tea RAG system */

export type TeaCategory =
  | "green"
  | "white"
  | "yellow"
  | "oolong"
  | "red"
  | "dark";

export interface TeaEntry {
  id: string;

  // Identity
  name: string;
  aliases: string[];
  category: TeaCategory;
  subcategory?: string;

  // Origin
  region: string;
  terroir?: string;
  cultivar?: string;

  // Processing
  processing: string[];
  oxidation: "none" | "light" | "medium" | "heavy" | "full" | "post-fermented";
  roast?: "none" | "light" | "medium" | "heavy";
  aging?: {
    viable: boolean;
    sweet_spot?: string;
  };

  // Flavor
  flavor_profile: string;
  /** Firsthand observational tasting notes — complements flavor_profile.
   *  ~150 words, handmade voice. Used on /tea/[slug] and in RAG embeddings. */
  tasting_notes: string;
  body: "light" | "medium" | "full";
  aroma_notes: string[];
  taste_notes: string[];

  // Brewing
  brewing: {
    temp_c: number;
    ratio_g_per_100ml: number;
    schedule_s: number[];
    max_infusions: number;
    rinse: boolean;
    rinse_hint?: string;
    tips?: string;
  };

  // Metadata
  price_range?: "budget" | "mid" | "premium" | "collector";
  beginner_friendly: boolean;
  sources: string[];
  updated: string;
}
