import { resolveMode } from "@/lib/adapters/mode";
import { stockQuoteMock } from "./mock";
import { stockQuoteReal } from "./real";
import type { StockQuoteAdapter } from "./types";

export type { StockQuoteAdapter, StockQuote } from "./types";

const mode = resolveMode(["FINNHUB_API_KEY"]);

export const stockQuote: StockQuoteAdapter = mode === "real" ? stockQuoteReal : stockQuoteMock;
