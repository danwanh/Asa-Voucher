import { supabase } from "../config/supabase.js";

export async function getDatabaseStatus() {
  return { configured: Boolean(supabase) };
}
