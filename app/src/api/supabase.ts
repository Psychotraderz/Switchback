import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { toTrail, type TrailRow } from "./trails.ts";
import type { DemoTrail } from "../data/demoTrails.ts";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Null until a Supabase project is configured; the app then uses demo data. */
export const supabase =
  url && key ? createClient(url, key, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } }) : null;

export async function fetchTrailsNear(lng: number, lat: number, radiusM = 25000): Promise<DemoTrail[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("trails_near", { lng, lat, radius_m: radiusM, max_rows: 100 });
  if (error) return null;
  return (data as TrailRow[]).map(toTrail);
}
