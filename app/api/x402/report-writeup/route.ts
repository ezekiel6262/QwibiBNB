import { createValidatedX402Route } from "@/lib/x402/validated-route";

export const maxDuration = 300;

const handlers = createValidatedX402Route((body) => ({
  serviceId: "s13-writeup-studio",
  inputs: {
    mode: body.mode,
    outputFormat: body.outputFormat,
    topic: body.topic,
    audience: body.audience,
    objective: body.objective,
    requiredSections: body.requiredSections,
    csvData: body.csvData,
    targetColumn: body.targetColumn,
    horizon: body.horizon,
    existingWorkNotes: body.existingWorkNotes,
    timeline: body.timeline,
    budgetNotes: body.budgetNotes,
  },
}));

export const GET = handlers.GET;
export const POST = handlers.POST;
