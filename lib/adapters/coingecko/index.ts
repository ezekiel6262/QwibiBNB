import { resolveMode } from "@/lib/adapters/mode";
import { coingeckoMock } from "./mock";
import { coingeckoReal } from "./real";
import type { CoinGeckoAdapter } from "./types";

export type { CoinGeckoAdapter } from "./types";

const mode = resolveMode(["COINGECKO_API_KEY"]);

export const coingecko: CoinGeckoAdapter = mode === "real" ? coingeckoReal : coingeckoMock;
