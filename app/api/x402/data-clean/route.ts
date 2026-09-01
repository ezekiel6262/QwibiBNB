import { createValidatedX402Route } from "@/lib/x402/validated-route";

export const maxDuration = 300;

const handlers = createValidatedX402Route((body) => ({
  serviceId: "s14-data-clean",
  inputs: {
    sourceType: body.sourceType,
    rawInput: body.rawInput,
    targetSchema: body.targetSchema,
  },
}));

export const GET = handlers.GET;
export const POST = handlers.POST;
