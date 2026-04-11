import { NextResponse } from "next/server";
import { searchTeas, CONFIDENCE_THRESHOLD } from "@/lib/rag/retrieve";
import type { TeaEntry } from "@/data/corpus/schema";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

const SYSTEM_PROMPT = `You are a gongfu cha brewing expert. Given a tea name or description, generate specific gongfu brewing parameters for that exact tea.

You must respond ONLY with valid JSON in this exact format:
{
  "teaName": "the specific tea name",
  "summary": "2-3 sentences about this tea — origin, character, what makes it interesting. Knowledgeable but concise.",
  "tempC": <number 70-100>,
  "ratioGPerMl": <number 0.04-0.08, grams of leaf per ml of water>,
  "rinse": <boolean, whether a rinse is recommended>,
  "doubleRinse": <boolean, true only for shou pu-erh or heavily pile-fermented teas>,
  "steepCount": <number 5-12, recommended number of infusions>,
  "firstSteepSeconds": <number 5-15>,
  "steepCurve": <number 1.2-1.5, multiplier applied to each subsequent steep>,
  "categoryId": "<one of: green, white, oolong, puerh, black — the broad tea family>"
}

Guidelines:
- Green/white/light oolong: lower temp (70-90), no rinse, gentler curve (1.2-1.3)
- Dark oolong/black: higher temp (90-100), rinse for roasted teas
- Pu-erh: full boil (95-100), always rinse, double rinse for shou
- Higher ratios (0.06-0.08) for teas that benefit from intensity (oolong, pu-erh)
- Lower ratios (0.04-0.055) for delicate teas (green, white)`;

// Corpus uses Chinese tea taxonomy; app UI uses Western category IDs
const CATEGORY_MAP: Record<string, string> = {
  green: "green",
  white: "white",
  yellow: "green",
  oolong: "oolong",
  red: "black",
  dark: "puerh",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function generateSchedule(
  firstSteep: number,
  curve: number,
  count: number
): number[] {
  const schedule: number[] = [firstSteep];
  for (let i = 1; i < count; i++) {
    schedule.push(Math.round(schedule[i - 1] * curve));
  }
  return schedule;
}

function mapCorpusEntry(entry: TeaEntry) {
  return {
    teaName: entry.name,
    summary: entry.flavor_profile,
    tempC: entry.brewing.temp_c,
    ratioGPerMl: entry.brewing.ratio_g_per_100ml / 100,
    rinse: entry.brewing.rinse,
    doubleRinse: false,
    schedule: entry.brewing.schedule_s,
    categoryId: CATEGORY_MAP[entry.category] || entry.category,
    rinseHint: entry.brewing.rinse_hint,
    source: "corpus" as const,
  };
}

async function llmFallback(query: string) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://gongfucha.app",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: query },
        ],
        temperature: 0.3,
        max_tokens: 400,
      }),
      signal: AbortSignal.timeout(15_000),
    }
  );

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response from AI");
  }

  const cleaned = content.replace(/^```(?:json)?\s*\n?|\n?```\s*$/g, "").trim();
  const parsed = JSON.parse(cleaned);

  // Validate and clamp all values
  const tempC = clamp(Math.round(parsed.tempC ?? 95), 70, 100);
  const ratioGPerMl = clamp(parsed.ratioGPerMl ?? 0.055, 0.04, 0.08);
  const rinse = Boolean(parsed.rinse);
  const doubleRinse = Boolean(parsed.doubleRinse);
  const steepCount = clamp(Math.round(parsed.steepCount ?? 8), 5, 12);
  const firstSteep = clamp(Math.round(parsed.firstSteepSeconds ?? 10), 5, 15);
  const curve = clamp(parsed.steepCurve ?? 1.35, 1.2, 1.5);

  const schedule = generateSchedule(firstSteep, curve, steepCount);

  return {
    teaName: String(parsed.teaName || "Unknown Tea"),
    summary: String(parsed.summary || ""),
    tempC,
    ratioGPerMl,
    rinse,
    doubleRinse,
    schedule,
    categoryId: String(parsed.categoryId || ""),
    source: "llm" as const,
  };
}

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string" || query.length > 500) {
      return NextResponse.json(
        { error: "Query is required (max 500 characters)" },
        { status: 400 }
      );
    }

    // Try corpus retrieval first
    try {
      const results = await searchTeas(query, 3);
      if (results.length > 0 && results[0].score >= CONFIDENCE_THRESHOLD) {
        const entry = JSON.parse(results[0].payload.entry as string) as TeaEntry;
        return NextResponse.json(mapCorpusEntry(entry));
      }
    } catch (err) {
      console.warn("RAG retrieval failed, falling back to LLM:", err);
    }

    // LLM fallback
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const result = await llmFallback(query);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        error:
          "Couldn't identify that tea. Try a different description, or use Custom Mode.",
      },
      { status: 500 }
    );
  }
}
