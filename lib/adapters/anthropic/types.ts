import type { PlanResult, ResearchSnippet } from "@/lib/pipeline/types";

export type PlanInput = {
  service: string;
  prompt: string;
  audience?: string;
  length?: string;
  inputs: Record<string, unknown>;
};

export type WriteSectionInput = {
  heading: string;
  instructions: string;
  context: ResearchSnippet[];
};

export type AnthropicAdapter = {
  planReport(input: PlanInput): Promise<PlanResult>;
  research(query: string): Promise<ResearchSnippet[]>;
  writeSection(input: WriteSectionInput): Promise<string>;
};
