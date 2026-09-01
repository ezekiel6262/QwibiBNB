import { createValidatedX402Route } from "@/lib/x402/validated-route";

export const maxDuration = 300;

const handlers = createValidatedX402Route((body) => {
  if (body.question) {
    if (body.connectionString) {
      throw new Error(
        "connectionString is not accepted by the public x402 endpoint because credentials must not be persisted; omit it to use the demo dataset"
      );
    }
    return {
      serviceId: "s7-text-to-sql",
      inputs: {
        question: body.question,
      },
    };
  }

  return {
    serviceId: "s8-dashboard-bi",
    inputs: {
      csvData: body.csvData,
      title: body.title,
    },
  };
});

export const GET = handlers.GET;
export const POST = handlers.POST;
