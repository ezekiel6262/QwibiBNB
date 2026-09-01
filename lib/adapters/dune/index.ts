import { resolveMode } from "@/lib/adapters/mode";
import { duneMock } from "./mock";
import { duneReal } from "./real";
import type { DuneAdapter } from "./types";

export type { DuneAdapter } from "./types";

const mode = resolveMode([
  "DUNE_API_KEY",
  "DUNE_QUERY_ID_HOLDERS",
  "DUNE_QUERY_ID_WHALES",
  "DUNE_QUERY_ID_PROTOCOL",
]);

export const dune: DuneAdapter = mode === "real" ? duneReal : duneMock;
