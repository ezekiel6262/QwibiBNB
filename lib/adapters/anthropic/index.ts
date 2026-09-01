import { resolveMode } from "@/lib/adapters/mode";
import { anthropicMock } from "./mock";
import { anthropicReal } from "./real";
import type { AnthropicAdapter } from "./types";

export type { AnthropicAdapter, PlanInput, WriteSectionInput } from "./types";

const mode = resolveMode(["ANTHROPIC_API_KEY"]);

export const anthropic: AnthropicAdapter = mode === "real" ? anthropicReal : anthropicMock;
