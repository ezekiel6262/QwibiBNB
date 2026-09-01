import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let cached: SupabaseClient<Database> | null = null;

/**
 * Service-role client for trusted server-side code only (pipeline stages, API routes).
 * Bypasses RLS - never expose this client or its key to the browser.
 */
export function supabaseAdmin() {
  if (cached) return cached;
  cached = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        // supabase-js reads go through fetch, and Next caches fetch GETs inside route
        // handlers - so a job row was read once and replayed forever. Measured: a buyer
        // polling a fresh job saw "planning" for eighteen consecutive polls while the row
        // moved to "delivered", meaning a finished job looks like it never completes.
        // Route-level dynamic config does not reach these calls; opting out here does.
        // Reads only - inserts and updates were never cached.
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    }
  );
  return cached;
}
