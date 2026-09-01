import type { ResearchSnippet } from "@/lib/pipeline/types";

export type GoogleAdapter = {
  research(query: string): Promise<ResearchSnippet[]>;
};
