import { z } from "zod";
import { anthropic } from "@/lib/adapters/anthropic";
import { rwa } from "@/lib/adapters/rwa";
import { renderPdfDocument } from "@/lib/pdf/render";
import type { ComposeResult, ServiceModule, StageContext } from "@/lib/pipeline/types";
import { RwaReportDocument } from "./render";

const inputSchema = z
  .object({
    protocolAddress: z.string().min(6, "provide a protocol or token address"),
    assetClass: z.enum(["treasury", "commodity", "real_estate"]).optional(),
    goal: z.string().optional(),
  })
  .transform((v) => ({
    protocolAddress: v.protocolAddress,
    assetClass: v.assetClass ?? "treasury",
    goal: v.goal ?? "",
    prompt: v.goal || `RWA analytics for ${v.protocolAddress}`,
  }));

function describeFigures(metrics: Awaited<ReturnType<typeof rwa.getRwaMetrics>>): string {
  return (
    `${metrics.protocolName}, a ${metrics.assetClass.replace("_", " ")} protocol, holds ` +
    `$${metrics.totalValueLockedUsd.toLocaleString("en-US")} TVL across ${metrics.holderCount.toLocaleString("en-US")} ` +
    `holders, yielding ${metrics.yieldApyPct}% APY with a backing ratio of ${metrics.backingRatioPct}%. ` +
    `${metrics.redemptions.length} redemptions in the observed window totaling ` +
    `$${metrics.redemptions.reduce((s, r) => s + r.amountUsd, 0).toLocaleString("en-US")}.`
  );
}

export const s11RwaAnalytics: ServiceModule = {
  id: "s11-rwa-analytics",
  label: "RWA Analytics",

  validateInputs(inputs: unknown) {
    return inputSchema.parse(inputs);
  },

  async compose(ctx: StageContext): Promise<ComposeResult> {
    const protocolAddress = String(ctx.job.inputs.protocolAddress ?? "");
    const assetClass = String(ctx.job.inputs.assetClass ?? "treasury") as
      | "treasury"
      | "commodity"
      | "real_estate";

    const metrics = await rwa.getRwaMetrics(protocolAddress, assetClass);
    const figures = describeFigures(metrics);

    const summary = await anthropic.writeSection({
      heading: "Executive summary",
      instructions: `${ctx.plan.composeInstructions} Key figures to interpret: ${figures}`,
      context: ctx.research,
    });

    const title = `RWA analytics: ${metrics.protocolName}`;
    const document = (
      <RwaReportDocument
        protocolAddress={protocolAddress}
        summary={summary}
        metrics={metrics}
        sources={ctx.research}
        jobId={ctx.job.id}
      />
    );

    const buffer = await renderPdfDocument(document);

    return { title, file: { buffer, contentType: "application/pdf", extension: "pdf" } };
  },
};
