import { z } from "zod";
import { anthropic } from "@/lib/adapters/anthropic";
import { renderPdfDocument } from "@/lib/pdf/render";
import type { ComposeResult, ServiceModule, StageContext } from "@/lib/pipeline/types";
import { OnchainReportDocument } from "./render";

const inputSchema = z
  .object({
    tokenAddress: z.string().min(6, "provide a token or wallet address"),
    goal: z.string().optional(),
  })
  .transform((v) => ({
    ...v,
    prompt: v.goal ?? `On-chain analytics for ${v.tokenAddress}`,
  }));

function describeFigures(ctx: StageContext): string {
  const { holders, whales, protocol } = ctx.onchain;
  const parts: string[] = [];
  if (holders) {
    parts.push(
      `${holders.totalHolders.toLocaleString("en-US")} total holders, with the top 10 holding ${holders.top10Pct}% of supply.`
    );
  }
  if (whales?.length) {
    parts.push(`${whales.length} large transfers observed in the current window.`);
  }
  if (protocol) {
    parts.push(
      `TVL of $${Math.round(protocol.tvlUsd).toLocaleString("en-US")}, 24h DEX volume of $${Math.round(
        protocol.dexVolume24hUsd
      ).toLocaleString("en-US")}.`
    );
  }
  return parts.join(" ");
}

export const s5OnchainAnalytics: ServiceModule = {
  id: "s5-onchain-analytics",
  label: "On-chain Analytics",
  usesOnchainData: true,

  validateInputs(inputs: unknown) {
    return inputSchema.parse(inputs);
  },

  async compose(ctx: StageContext): Promise<ComposeResult> {
    const tokenAddress = String(ctx.job.inputs.tokenAddress ?? "");
    const figures = describeFigures(ctx);

    const summary = await anthropic.writeSection({
      heading: "Executive summary",
      instructions: `${ctx.plan.composeInstructions} Key figures to interpret: ${figures}`,
      context: ctx.research,
    });

    const title = `On-chain analytics: ${tokenAddress}`;
    const document = (
      <OnchainReportDocument
        tokenAddress={tokenAddress}
        summary={summary}
        onchain={ctx.onchain}
        sources={ctx.research}
        jobId={ctx.job.id}
      />
    );

    const buffer = await renderPdfDocument(document);

    return { title, file: { buffer, contentType: "application/pdf", extension: "pdf" } };
  },
};
