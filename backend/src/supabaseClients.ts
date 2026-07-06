import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { settings } from "./config.js";

export function getUserSupabaseClient(token: string): SupabaseClient {
  return createClient(settings.supabaseUrl, settings.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export function getServiceSupabaseClient(): SupabaseClient {
  return createClient(settings.supabaseUrl, settings.supabaseServiceRoleKey);
}
