import { createValidatedX402Route } from "@/lib/x402/validated-route";

export const maxDuration = 300;

const handlers = createValidatedX402Route((body) => ({
  serviceId: "s2-prompt-to-financial-model",
  inputs: {
    modelName: body.modelName,
    initialRevenue: body.initialRevenue,
    growthRate: body.growthRate,
    ebitdaMargin: body.ebitdaMargin,
    taxRate: body.taxRate,
    wacc: body.wacc,
    terminalGrowth: body.terminalGrowth,
    years: body.years,
    context: body.context,
  },
}));

export const GET = handlers.GET;
export const POST = handlers.POST;
