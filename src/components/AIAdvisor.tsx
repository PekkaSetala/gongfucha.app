"use client";

import { useState } from "react";

interface AIResult {
  teaName: string;
  category: string;
  tempC: number;
  ratioGPerMl: number;
  rinse: boolean;
  schedule: number[];
  summary: string;
}

interface AIAdvisorProps {
  onStartBrewing: (result: AIResult, vesselMl: number) => void;
}

export function AIAdvisor({ onStartBrewing }: AIAdvisorProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!res.ok) throw new Error("Failed to identify tea");

      const data = await res.json();
      setResult(data);
    } catch {
      setError(
        "Couldn't identify that tea. Try a different description, or use Custom Mode instead."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-secondary leading-relaxed">
        Describe your tea — name, origin, appearance, or any details you have.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder='e.g. "Da Hong Pao" or "light floral oolong"'
          className="flex-1 px-4 py-3 rounded-xl border border-border bg-surface text-[14px] text-primary placeholder:text-tertiary focus:outline-none focus:border-clay transition-colors duration-150"
          disabled={loading}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !query.trim()}
          className="px-5 py-3 rounded-xl bg-clay text-[#FAF7F2] text-[14px] font-medium disabled:opacity-40 transition-opacity duration-150"
        >
          {loading ? "..." : "Identify"}
        </button>
      </div>

      {error && (
        <p className="text-[13px] text-clay italic">{error}</p>
      )}

      {result && (
        <div className="bg-surface border border-border rounded-[14px] p-5 mt-2">
          <h3 className="text-lg font-medium mb-1">{result.teaName}</h3>
          <p className="text-[12px] text-tertiary mb-3">
            Closest match: {result.category}
          </p>

          <div className="flex gap-5 mb-3">
            <div>
              <span className="block text-[10px] font-medium uppercase tracking-[1px] text-tertiary">
                Temp
              </span>
              <span className="text-[14px] font-medium">{result.tempC}°C</span>
            </div>
            <div>
              <span className="block text-[10px] font-medium uppercase tracking-[1px] text-tertiary">
                Rinse
              </span>
              <span className="text-[14px] font-medium">
                {result.rinse ? "Yes" : "No"}
              </span>
            </div>
          </div>

          <p className="text-[13px] text-secondary leading-relaxed italic border-t border-border pt-3 mb-4">
            {result.summary}
          </p>

          <button
            onClick={() => onStartBrewing(result, 120)}
            className="w-full py-3.5 rounded-[14px] bg-clay text-[#FAF7F2] font-medium text-[15px] transition-colors duration-150 hover:bg-clay-hover"
          >
            Start Brewing
          </button>
        </div>
      )}
    </div>
  );
}
