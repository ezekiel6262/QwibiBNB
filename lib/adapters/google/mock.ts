import type { ResearchSnippet } from "@/lib/pipeline/types";
import type { GoogleAdapter } from "./types";

export const googleMock: GoogleAdapter = {
  async research(query: string): Promise<ResearchSnippet[]> {
    return [
      {
        id: `${query}-1`,
        source: "Qwibi mock research corpus (Gemini grounding placeholder)",
        text: `Fixture finding related to "${query}": aggregate indicators moved modestly over the
          trailing period, with concentration in a small number of leading participants.`,
      },
      {
        id: `${query}-2`,
        source: "Qwibi mock research corpus (Gemini grounding placeholder)",
        text: `Fixture finding related to "${query}": secondary metrics were broadly stable,
          suggesting the trend is structural rather than a single-period anomaly.`,
      },
    ];
  },
};
