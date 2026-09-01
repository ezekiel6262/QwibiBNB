import { resolveMode } from "@/lib/adapters/mode";
import { moralisMock } from "./mock";
import { moralisReal } from "./real";
import type { MoralisAdapter } from "./types";

export type { MoralisAdapter } from "./types";

const mode = resolveMode(["MORALIS_API_KEY"]);

export const moralis: MoralisAdapter = mode === "real" ? moralisReal : moralisMock;
