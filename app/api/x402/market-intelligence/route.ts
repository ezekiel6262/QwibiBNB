import { createValidatedX402Route } from "@/lib/x402/validated-route";

export const maxDuration = 300;

const handlers = createValidatedX402Route((body) => ({
  serviceId: "s6-market-intelligence",
  inputs: {
    cryptoSymbols: body.cryptoSymbols,
    stockTickers: body.stockTickers,
    objective: body.objective,
  },
}));

export const GET = handlers.GET;
export const POST = handlers.POST;
