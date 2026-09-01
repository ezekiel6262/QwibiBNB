import { z } from "zod";
import { anthropic } from "@/lib/adapters/anthropic";
import { coingecko } from "@/lib/adapters/coingecko";
import { stockQuote } from "@/lib/adapters/stockquote";
import { renderPdfDocument } from "@/lib/pdf/render";
import type { ComposeResult, ServiceModule, StageContext } from "@/lib/pipeline/types";
import { cryptoToRow, equityToRow, describeFigures, type AssetRow } from "./market";
import { MarketBriefDocument } from "./render";

function splitSymbols(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    )
  ).slice(0, 8);
}

const inputSchema = z
  .object({
    cryptoSymbols: z.string().optional(),
    stockTickers: z.string().optional(),
    objective: z.string().optional(),
  })
  .transform((v) => {
    const crypto = splitSymbols(v.cryptoSymbols ?? "");
    const equity = splitSymbols(v.stockTickers ?? "");
    const symbols = [...crypto, ...equity].join(", ");
    return {
      cryptoSymbols: crypto,
      stockTickers: equity,
      objective: v.objective?.trim() ?? "",
      prompt: `Market intelligence brief: ${symbols}`,
    };
  })
  .refine((v) => v.cryptoSymbols.length > 0 || v.stockTickers.length > 0, {
    message: "list at least one crypto symbol or stock ticker, e.g. BTC or AAPL",
  });

export const s6MarketIntelligence: ServiceModule = {
  id: "s6-market-intelligence",
  label: "Market Intelligence",

  validateInputs(inputs: unknown) {
    return inputSchema.parse(inputs);
  },

  async compose(ctx: StageContext): Promise<ComposeResult> {
    const cryptoSymbols = Array.isArray(ctx.job.inputs.cryptoSymbols)
      ? (ctx.job.inputs.cryptoSymbols as string[])
      : [];
    const stockTickers = Array.isArray(ctx.job.inputs.stockTickers)
      ? (ctx.job.inputs.stockTickers as string[])
      : [];
    const objective = String(ctx.job.inputs.objective ?? "");

    // One unlisted ticker must not void a brief the buyer has already paid for. Settle
    // every lookup, report on what resolved, and disclose what did not.
    const [cryptoResults, equityResults] = await Promise.all([
      Promise.allSettled(cryptoSymbols.map((s) => coingecko.getMarketSnapshot(s))),
      Promise.allSettled(stockTickers.map((t) => stockQuote.getQuote(t))),
    ]);

    const unavailable: string[] = [];
    const rows: AssetRow[] = [];

    cryptoResults.forEach((result, i) => {
      if (result.status === "fulfilled") rows.push(cryptoToRow(result.value));
      else {
        unavailable.push(cryptoSymbols[i]);
        console.warn(`market-intelligence: no crypto data for ${cryptoSymbols[i]}`, result.reason);
      }
    });

    equityResults.forEach((result, i) => {
      if (result.status === "fulfilled") rows.push(equityToRow(result.value));
      else {
        unavailable.push(stockTickers[i]);
        console.warn(`market-intelligence: no equity data for ${stockTickers[i]}`, result.reason);
      }
    });

    // Nothing resolved - a brief with no assets is worthless, so fail honestly instead.
    if (rows.length === 0) {
      throw new Error(
        `market-intelligence: no market data available for any requested symbol (${unavailable.join(", ")})`
      );
    }

    const figures = describeFigures(rows);
    const preparedAt = new Date().toISOString();

    const summary = await anthropic.writeSection({
      heading: "Executive summary",
      instructions:
        `${ctx.plan.composeInstructions} This is analysis framing only, never personalized ` +
        `investment advice - do not tell the reader to buy, sell, or hold anything. Key figures ` +
        `to interpret: ${figures}` +
        (objective ? ` The reader's stated focus: ${objective}.` : ""),
      context: ctx.research,
    });

    const title = `Market intelligence: ${rows.map((r) => r.symbol).join(", ")}`;
    const document = (
      <MarketBriefDocument
        rows={rows}
        summary={summary}
        preparedAt={preparedAt}
        jobId={ctx.job.id}
        objective={objective}
        unavailable={unavailable}
      />
    );

    const buffer = await renderPdfDocument(document);

    return { title, file: { buffer, contentType: "application/pdf", extension: "pdf" } };
  },
};
