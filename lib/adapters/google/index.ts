import { resolveMode } from "@/lib/adapters/mode";
import { googleMock } from "./mock";
import { googleReal } from "./real";
import type { GoogleAdapter } from "./types";

export type { GoogleAdapter } from "./types";

const mode = resolveMode(["GEMINI_API_KEY"]);

export const google: GoogleAdapter = mode === "real" ? googleReal : googleMock;
