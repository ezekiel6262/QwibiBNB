import { createValidatedX402Route } from "@/lib/x402/validated-route";

export const maxDuration = 300;

const handlers = createValidatedX402Route((body) => ({
  serviceId: "s12-wallet-statement",
  inputs: {
    addresses: body.addresses,
    template: body.template,
  },
}));

export const GET = handlers.GET;
export const POST = handlers.POST;
