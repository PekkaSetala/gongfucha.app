import { NextResponse } from "next/server";
import { getTeas } from "@/data/teas";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

const SYSTEM_PROMPT = `You are a gongfu cha tea identification expert. Given a tea description, identify the tea and map it to the closest category from this list:

- Green Tea (green, unoxidized)
- Fresh White (young white tea, silver needle, white peony)
- Sheng Pu-erh (raw pu-erh, living tea)
- Light Oolong (high mountain, tieguanyin, light oxidation)
- Dark Oolong (yancha, da hong pao, heavy roast)
- Black Tea (hongcha, red tea, fully oxidized)
- Aged White (3+ year white tea, aged cake)
- Shou Pu-erh (ripe pu-erh, cooked, pile-fermented)

Respond ONLY with valid JSON in this exact format:
{
  "teaName": "identified tea name",
  "categoryId": "one of: green, fresh-white, sheng, light-oolong, dark-oolong, black, aged-white, shou",
  "summary": "2-3 sentences about this specific tea — origin, character, what makes it interesting. Be knowledgeable but concise."
}`;

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

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
          max_tokens: 300,
        }),
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

    // Parse AI response
    const parsed = JSON.parse(content);
    const teas = getTeas();
    const matchedTea = teas.find((t) => t.id === parsed.categoryId);

    if (!matchedTea) {
      throw new Error("Could not match to a tea category");
    }

    return NextResponse.json({
      teaName: parsed.teaName,
      category: matchedTea.name,
      categoryId: matchedTea.id,
      tempC: matchedTea.tempC,
      ratioGPerMl: matchedTea.ratioGPerMl,
      rinse: matchedTea.rinse,
      schedule: matchedTea.baselineSchedule,
      summary: parsed.summary,
    });
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
