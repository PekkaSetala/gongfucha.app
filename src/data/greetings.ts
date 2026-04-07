import { seededPick } from "@/lib/pick";

export type TimeBand = "morning" | "afternoon" | "evening";

type Greeting = {
  text: string;
  emphasis?: string;
  band: TimeBand | "anytime";
};

const greetings: Greeting[] = [
  // Morning (5:00–11:59)
  { text: "First water, then leaves, then quiet", band: "morning" },
  { text: "Steam rising, nowhere to be yet", band: "morning" },
  { text: "Early enough to steep slow", emphasis: "slow", band: "morning" },
  { text: "Kettle on, day hasn\u2019t started", band: "morning" },

  // Afternoon (12:00–16:59)
  { text: "A pause between things", band: "afternoon" },
  { text: "Somewhere between tasks", band: "afternoon" },
  { text: "Afternoon light, warm cup", band: "afternoon" },
  { text: "Not in a rush", emphasis: "rush", band: "afternoon" },

  // Evening (17:00–4:59)
  { text: "Dark leaves for a quiet hour", emphasis: "quiet", band: "evening" },
  { text: "End it slower than it started", emphasis: "slower", band: "evening" },
  { text: "One more steep, then done", band: "evening" },
  { text: "Evening session", band: "evening" },

  // Anytime
  { text: "Same leaves, different steep", emphasis: "different", band: "anytime" },
  { text: "Leaves first, then patience", emphasis: "patience", band: "anytime" },
  { text: "The second steep is where it opens up", band: "anytime" },
  { text: "The cup doesn\u2019t rush", emphasis: "rush", band: "anytime" },
  { text: "One gram more, different cup", band: "anytime" },
  { text: "Let the water do the work", emphasis: "work", band: "anytime" },
  { text: "Back to the same tea", band: "anytime" },
  { text: "Just enough leaf", band: "anytime" },
];

function getTimeBand(hour: number): TimeBand {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

export function getHeadline(
  hour: number,
  seed: number
): { text: string; emphasis?: string } {
  const band = getTimeBand(hour);
  const candidates = greetings.filter(
    (g) => g.band === band || g.band === "anytime"
  );
  const picked = seededPick(candidates, seed);
  return { text: picked.text, emphasis: picked.emphasis };
}
