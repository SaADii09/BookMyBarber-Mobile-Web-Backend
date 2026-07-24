/**
 * Supabase Realtime-only client for haircut request status updates.
 * Narrow exception to the "no @supabase/supabase-js in client apps" rule.
 * Used exclusively for Realtime subscriptions — no DB queries, no auth.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabaseRealtime = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 5,
    },
  },
});
