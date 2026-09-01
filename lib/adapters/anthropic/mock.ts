import type { ResearchSnippet } from "@/lib/pipeline/types";
import type { AnthropicAdapter, PlanInput, WriteSectionInput } from "./types";

function titleCase(text: string): string {
  return text
    .split(" ")
    .slice(0, 8)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const anthropicMock: AnthropicAdapter = {
  async planReport(input: PlanInput) {
    if (input.service === "s5-onchain-analytics") {
      const tokenAddress = String(input.inputs.tokenAddress ?? "");
      return {
        outline: [
          { id: "summary", heading: "Executive summary" },
          { id: "holders", heading: "Holder structure" },
          { id: "whales", heading: "Whale movements" },
          { id: "protocol", heading: "Protocol metrics" },
        ],
        researchQueries: [`on-chain context for ${tokenAddress}`],
        onchainTasks: [
          { kind: "holders" as const, tokenAddress },
          { kind: "whales" as const, tokenAddress },
          { kind: "protocol" as const, tokenAddress },
        ],
        walletAddresses: [],
        composeInstructions:
          "Plain prose, no markdown headers, no unicode dashes. Interpret the on-chain " +
          "figures given to you - never invent a number that is not in that data.",
      };
    }

    if (input.service === "s2-prompt-to-financial-model") {
      return {
        outline: [{ id: "summary", heading: "Executive summary" }],
        researchQueries: [],
        onchainTasks: [],
        walletAddresses: [],
        composeInstructions:
          "Plain prose, no markdown headers, no unicode dashes. Interpret the computed " +
          "figures given to you - never invent a number that is not in that data.",
      };
    }

    if (input.service === "s3-data-analysis-run") {
      return {
        outline: [{ id: "summary", heading: "Executive summary" }],
        researchQueries: [],
        onchainTasks: [],
        walletAddresses: [],
        composeInstructions:
          "Plain prose, no markdown headers, no unicode dashes. Interpret the computed " +
          "statistics plainly - never invent a number that is not in that data.",
      };
    }

    if (input.service === "s4-ml-forecasts") {
      return {
        outline: [{ id: "summary", heading: "Executive summary" }],
        researchQueries: [],
        onchainTasks: [],
        walletAddresses: [],
        composeInstructions:
          "Plain prose, no markdown headers, no unicode dashes. Interpret the model's " +
          "validation metrics plainly - never invent a number that is not in that data.",
      };
    }

    if (input.service === "s7-text-to-sql") {
      return {
        outline: [{ id: "summary", heading: "Answer" }],
        researchQueries: [],
        onchainTasks: [],
        walletAddresses: [],
        composeInstructions:
          "Plain prose, no markdown headers, no unicode dashes. Interpret only the query " +
          "results given to you - never invent a row, column, or number not in that data.",
      };
    }

    if (input.service === "s8-dashboard-bi") {
      return {
        outline: [{ id: "summary", heading: "Executive summary" }],
        researchQueries: [],
        onchainTasks: [],
        walletAddresses: [],
        composeInstructions:
          "Plain prose, no markdown headers, no unicode dashes. Interpret the chart figures " +
          "given to you - never invent a number that is not in that data.",
      };
    }

    if (input.service === "s9-strategy-backtester") {
      return {
        outline: [{ id: "summary", heading: "Executive summary" }],
        researchQueries: [],
        onchainTasks: [],
        walletAddresses: [],
        composeInstructions:
          "Plain prose, no markdown headers, no unicode dashes. Interpret the backtest " +
          "figures given to you plainly, including the overfitting caveats - never invent a " +
          "number that is not in that data, and never claim the result predicts future " +
          "performance.",
      };
    }

    if (input.service === "s11-rwa-analytics") {
      const protocolAddress = String(input.inputs.protocolAddress ?? "");
      return {
        outline: [
          { id: "summary", heading: "Executive summary" },
          { id: "yield", heading: "Yield and backing" },
          { id: "redemptions", heading: "Redemption flows" },
        ],
        researchQueries: [`RWA protocol context for ${protocolAddress}`],
        onchainTasks: [],
        walletAddresses: [],
        composeInstructions:
          "Plain prose, no markdown headers, no unicode dashes. Interpret the yield, " +
          "backing, and redemption figures given to you - never invent a number that is not " +
          "in that data.",
      };
    }

    if (input.service === "s13-writeup-studio") {
      const mode = input.inputs.mode;
      return {
        outline: [{ id: "summary", heading: "Overview" }],
        researchQueries: [],
        onchainTasks: [],
        walletAddresses: [],
        composeInstructions:
          mode === "writeup_existing"
            ? "Plain prose, no markdown headers, no unicode dashes. Ground every claim in " +
              "the provided notes - document only what is stated there, never invent " +
              "results, metrics, or outcomes that are not present in the notes."
            : "Plain prose, no markdown headers, no unicode dashes. Interpret the computed " +
              "figures given to you - never invent a number that is not in that data.",
      };
    }

    if (input.service === "s14-data-clean") {
      return {
        outline: [],
        researchQueries: [],
        onchainTasks: [],
        walletAddresses: [],
        composeInstructions: "",
      };
    }

    if (input.service === "s6-market-intelligence") {
      return {
        outline: [{ id: "summary", heading: "Executive summary" }],
        researchQueries: [],
        onchainTasks: [],
        walletAddresses: [],
        composeInstructions:
          "Plain prose, no markdown headers, no unicode dashes. Interpret the market data " +
          "given to you - never invent a number that is not in that data. Analysis framing " +
          "only, never personalized investment advice.",
      };
    }

    if (input.service === "s12-wallet-statement") {
      const addresses = Array.isArray(input.inputs.addresses)
        ? (input.inputs.addresses as string[])
        : [];
      return {
        outline: [
          { id: "summary", heading: "Executive summary" },
          { id: "income", heading: "Income and stability" },
          { id: "ledger", heading: "Transaction history" },
        ],
        researchQueries: [],
        onchainTasks: [],
        walletAddresses: addresses,
        composeInstructions:
          "Plain prose, no markdown headers, no unicode dashes. Present and interpret " +
          "only the figures given to you - never fabricate, inflate, or optimize a number.",
      };
    }

    const topic = titleCase(input.prompt);
    return {
      outline: [
        { id: "summary", heading: "Executive summary" },
        { id: "context", heading: `Context: ${topic}` },
        { id: "findings", heading: "Key findings" },
        { id: "implications", heading: "Implications" },
      ],
      researchQueries: [input.prompt, `${input.prompt} recent developments`],
      onchainTasks: [],
      walletAddresses: [],
      composeInstructions:
        "Plain prose, no markdown headers, no unicode dashes. Cite every figure to a source.",
    };
  },

  async research(query: string): Promise<ResearchSnippet[]> {
    return [
      {
        id: `${query}-1`,
        source: "Qwibi mock research corpus",
        text: `Fixture finding related to "${query}": aggregate indicators moved modestly over the
          trailing period, with concentration in a small number of leading participants.`,
      },
      {
        id: `${query}-2`,
        source: "Qwibi mock research corpus",
        text: `Fixture finding related to "${query}": secondary metrics were broadly stable,
          suggesting the trend is structural rather than a single-period anomaly.`,
      },
    ];
  },

  async writeSection(input: WriteSectionInput): Promise<string> {
    const cited = input.context.map((c) => c.text).join(" ");
    return `${input.instructions} ${cited}`.trim();
  },
};
