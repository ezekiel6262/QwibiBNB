import { GoogleGenAI } from "@google/genai";
import type { ResearchSnippet } from "@/lib/pipeline/types";
import type { GoogleAdapter } from "./types";

const MODEL = "gemini-flash-latest";
const RESEARCH_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 2;
const RETRY_BACKOFF_MS = 800;

function client() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generate(query: string) {
  return client().models.generateContent({
    model: MODEL,
    contents: query,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction:
        "You are the Qwibi researcher. Given a query, use Google Search to find 2 to 4 " +
        "well-known, verifiable findings relevant to it. Ground every claim in an actual " +
        "search result - never state something you did not find.",
    },
  });
}

export const googleReal: GoogleAdapter = {
  async research(query: string): Promise<ResearchSnippet[]> {
    // Grounded search calls have no built-in deadline and can hang under provider load -
    // a single stuck call would otherwise blow past the serverless function's own timeout
    // and orphan the whole job. Degrade to no research for this query rather than hang.
    // The provider's free tier also returns transient 503 "high demand" errors often enough
    // in practice to warrant a real retry, not just a single-shot timeout.
    let response: Awaited<ReturnType<typeof generate>> | null = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const timeout = new Promise<"timeout">((resolve) =>
        setTimeout(() => resolve("timeout"), RESEARCH_TIMEOUT_MS)
      );
      try {
        const outcome = await Promise.race([generate(query), timeout]);
        if (outcome !== "timeout") {
          response = outcome;
          break;
        }
      } catch {
        // fall through to retry/backoff below
      }
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_BACKOFF_MS);
    }
    if (!response) return [];

    const grounding = response.candidates?.[0]?.groundingMetadata;
    const chunks = grounding?.groundingChunks ?? [];
    const supports = grounding?.groundingSupports ?? [];

    if (supports.length === 0 || chunks.length === 0) {
      const text = response.text;
      if (!text) return [];
      return [{ id: `${query}-1`, source: "gemini (no search performed)", text }];
    }

    return supports
      .filter((support) => support.segment?.text)
      .map((support, index) => {
        const chunkIndex = support.groundingChunkIndices?.[0];
        const web = chunkIndex !== undefined ? chunks[chunkIndex]?.web : undefined;
        return {
          id: `${query}-${index + 1}`,
          source: web?.title ?? web?.uri ?? "Google Search",
          text: support.segment!.text!,
        };
      });
  },
};
