import { z } from "zod";
import { anthropic } from "@/lib/adapters/anthropic";
import { renderPdfDocument } from "@/lib/pdf/render";
import type { ComposeResult, ServiceModule, StageContext } from "@/lib/pipeline/types";
import { WalletStatementDocument, TEMPLATE_LABELS } from "./render";

const inputSchema = z
  .object({
    addresses: z.string().min(6, "paste at least one wallet address"),
    template: z.enum(Object.keys(TEMPLATE_LABELS) as [string, ...string[]]).optional(),
  })
  .transform((v) => {
    const addressList = Array.from(
      new Set(
        v.addresses
          .split(/[\n,]+/)
          .map((a) => a.trim())
          .filter(Boolean)
      )
    );
    return {
      addresses: addressList,
      template: v.template ?? "personal_review",
      prompt: `Wallet financial statement for ${addressList.length} address${
        addressList.length === 1 ? "" : "es"
      }`,
    };
  })
  .refine((v) => v.addresses.length > 0, { message: "paste at least one wallet address" });

export const s12WalletStatement: ServiceModule = {
  id: "s12-wallet-statement",
  label: "Wallet Financial Statement",

  validateInputs(inputs: unknown) {
    return inputSchema.parse(inputs);
  },

  async compose(ctx: StageContext): Promise<ComposeResult> {
    const addresses = ctx.plan.walletAddresses;
    const template = String(ctx.job.inputs.template ?? "personal_review");
    const summary = ctx.walletSummary;

    const narrative = summary
      ? await anthropic.writeSection({
          heading: "Executive summary",
          instructions:
            `${ctx.plan.composeInstructions} Key figures to interpret: average monthly ` +
            `income of $${Math.round(summary.monthlyIncomeAvgUsd).toLocaleString("en-US")}, ` +
            `an income stability score of ${summary.incomeStabilityScore}/100, an expense ` +
            `ratio of ${summary.expenseRatio}, and a net worth trend of ${summary.netWorthTrendPct}%.`,
          context: ctx.research,
        })
      : "No transaction activity was found for the given addresses in the observed window.";

    const title = `Wallet financial statement (${addresses.length} address${
      addresses.length === 1 ? "" : "es"
    })`;

    const document = (
      <WalletStatementDocument
        addresses={addresses}
        template={template}
        narrative={narrative}
        summary={summary}
        transactions={ctx.transactions}
        jobId={ctx.job.id}
      />
    );

    const buffer = await renderPdfDocument(document);

    return { title, file: { buffer, contentType: "application/pdf", extension: "pdf" } };
  },
};
