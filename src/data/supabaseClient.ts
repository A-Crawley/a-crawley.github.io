import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A Supabase client built from the REACT_APP_SUPABASE_* settings, or `null` when they are missing
 * or empty. Callers must handle `null`: creating a client without a URL throws, and doing that
 * while the page loads blanks the whole page.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const url = import.meta.env.REACT_APP_SUPABASE_URL;
  const key = import.meta.env.REACT_APP_SUPABASE_KEY;
  if (!url || !key) return null;
  try {
    return createClient(url, key);
  } catch (error) {
    console.error("Could not create the Supabase client:", error);
    return null;
  }
}
