import Anthropic from "@anthropic-ai/sdk";
import type { ResearchSnippet } from "@/lib/pipeline/types";
import type { AnthropicAdapter, PlanInput, WriteSectionInput } from "./types";

const MODEL = "claude-sonnet-4-6";

// One attempt, and deliberately so. Retrying here spends the same 90s the rest of the
// pipeline needs: a resilient call makes the *function* more likely to be hard-killed at
// the ceiling, and a hard kill skips our catch entirely - no failed status, no retry
// dispatch, an orphaned job. Job-level retry lives in /api/jobs/process, which re-runs in
// a fresh invocation with a clean budget. That is the right place for it.
const REQUEST_TIMEOUT_MS = 40_000;
const MAX_ATTEMPTS = 1;
const RETRY_BACKOFF_MS = 1_000;

/**
 * SDK-internal retries are left at their default. They absorb a throttle inside the 40s
 * window without adding a second full-length attempt on top of it, which is what keeps
 * the pipeline inside the function's 90s ceiling.
 */
function client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: REQUEST_TIMEOUT_MS });
}

class AnthropicTimeoutError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry only what a second attempt could plausibly fix. A bad key, a malformed request or
 * an exhausted credit balance will fail identically every time, and burning the retry
 * budget on them just delays the failure the buyer needs to see.
 */
function isRetryable(err: unknown): boolean {
  if (err instanceof AnthropicTimeoutError) return true;
  if (err instanceof Anthropic.APIConnectionError) return true;
  if (err instanceof Anthropic.APIError) {
    const status = err.status;
    return status === 408 || status === 429 || (typeof status === "number" && status >= 500);
  }
  return false;
}

async function raceTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new AnthropicTimeoutError(`anthropic: ${label} timed out after ${REQUEST_TIMEOUT_MS}ms`)),
      REQUEST_TIMEOUT_MS
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * The SDK call has no deadline of its own - under provider load a hung request can run
 * well past the serverless function's own timeout and orphan the whole job (the function
 * gets hard-killed before our catch block ever runs). Bound each attempt, retry the
 * transient ones, and surface anything else immediately so the job reaches "failed".
 *
 * Takes a factory rather than a promise: a rejected promise cannot be re-run.
 */
async function withTimeout<T>(start: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await raceTimeout(start(), label);
    } catch (err) {
      lastError = err;
      if (attempt === MAX_ATTEMPTS || !isRetryable(err)) throw err;
      console.warn(`anthropic: ${label} attempt ${attempt} failed, retrying -`, err);
      await sleep(RETRY_BACKOFF_MS);
    }
  }
  throw lastError;
}

function textOf(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

/**
 * Claude sometimes wraps JSON in markdown code fences or adds leading/trailing prose
 * despite being told to respond with strict JSON - extract the outermost {...} or [...]
 * by bracket-depth matching rather than trusting the whole response to be valid JSON.
 */
function parseJsonResponse<T>(text: string): T {
  const trimmed = text.trim();
  const openIdx = trimmed.search(/[[{]/);
  if (openIdx === -1) return JSON.parse(trimmed) as T;

  const open = trimmed[openIdx];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let endIdx = -1;

  for (let i = openIdx; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === "\\") {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }

  const candidate = endIdx === -1 ? trimmed.slice(openIdx) : trimmed.slice(openIdx, endIdx + 1);
  return JSON.parse(candidate) as T;
}

export const anthropicReal: AnthropicAdapter = {
  async planReport(input: PlanInput) {
    const message = await withTimeout(
      () => client().messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        "You are the Qwibi job planner. Decompose this request into a structured plan.\n" +
        "Respond with strict JSON: { outline: [{id, heading}], researchQueries: string[], " +
        "onchainTasks: [{kind: 'holders'|'whales'|'protocol', tokenAddress: string}], " +
        "walletAddresses: string[], composeInstructions: string }. researchQueries must have " +
        "at most 2 entries - pick the most important angles rather than one query per entity " +
        "mentioned in the request, since each query runs a real, billed web search. " +
        "onchainTasks is only " +
        "for services that need on-chain summary data (e.g. s5-onchain-analytics). " +
        "walletAddresses is only for s12-wallet-statement, taken directly from the " +
        "request's inputs.addresses. Return empty arrays otherwise. Every deliverable " +
        "must end in a downloadable file, never a chat answer. Never " +
        "fabricate figures - narrative sections must only reference data produced by the " +
        "fetch and compute steps. Use plain hyphens, never em dashes or en dashes.",
      messages: [
        {
          role: "user",
          content: `Service: ${input.service}\nPrompt: ${input.prompt}\nAudience: ${
            input.audience ?? "general"
          }\nLength: ${input.length ?? "standard"}\nInputs: ${JSON.stringify(input.inputs)}`,
        },
      ],
      }),
      "planReport"
    );
    return parseJsonResponse(textOf(message));
  },

  async research(query: string): Promise<ResearchSnippet[]> {
    const message = await withTimeout(
      () => client().messages.create({
        model: MODEL,
        max_tokens: 1536,
        system:
          "You are the Qwibi researcher. Given a query, return 2 to 4 well-known, verifiable " +
          "findings relevant to it, from your training knowledge. Respond with strict JSON: " +
          "[{id, source, text}]. Never fabricate a source or a figure you are not confident in.",
        messages: [{ role: "user", content: query }],
      }),
      "research"
    );
    return parseJsonResponse(textOf(message));
  },

  async writeSection(input: WriteSectionInput): Promise<string> {
    const message = await withTimeout(
      () => client().messages.create({
        model: MODEL,
        max_tokens: 1024,
        system:
          "You are the Qwibi writer. Write connective prose for a section of a professional " +
          "deliverable.\n\nWrite plain prose only, no markdown headers. Use plain hyphens, " +
          "never em dashes or en dashes.",
        messages: [
          {
            role: "user",
            content: `Heading: ${input.heading}\nInstructions: ${input.instructions}\n\n` +
              `Pre-gathered research (do not invent facts beyond these): ${JSON.stringify(
                input.context
              )}`,
          },
        ],
      }),
      "writeSection"
    );
    return textOf(message);
  },
};
