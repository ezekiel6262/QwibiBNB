import type { ComposeResult, ServiceModule, StageContext } from "@/lib/pipeline/types";

export async function compose(service: ServiceModule, ctx: StageContext): Promise<ComposeResult> {
  return service.compose(ctx);
}
