import { CAMPUS_CENTER } from "@/lib/constants";
import { type Bus } from "@/lib/types";
import { isMissingTableError, toDbError } from "@/lib/supabase/errors";

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerSupabaseClient>>;

function jitter(value: number, scale = 0.0006) {
  return value + (Math.random() - 0.5) * scale;
}

export async function getBuses(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("buses").select("*").order("name");
  if (error) {
    if (isMissingTableError(error, "buses")) {
      return [];
    }

    throw toDbError(error, "Unable to load buses", "buses");
  }

  return (data ?? []) as Bus[];
}

export async function simulateBusMovement(supabase: SupabaseClient) {
  const buses = await getBuses(supabase);

  const updates = buses.map((bus) => ({
    id: bus.id,
    lat: jitter(bus.lat),
    lng: jitter(bus.lng),
    updated_at: new Date().toISOString(),
  }));

  if (updates.length) {
    const { error } = await supabase.from("buses").upsert(updates, { onConflict: "id" });
    if (error) throw toDbError(error, "Unable to simulate buses", "buses");
  }

  return getBuses(supabase);
}

export function estimateEtaMinutes(lat: number, lng: number) {
  const distance = Math.sqrt(
    Math.pow((lat - CAMPUS_CENTER.lat) * 111, 2) +
      Math.pow((lng - CAMPUS_CENTER.lng) * 111 * Math.cos((lat * Math.PI) / 180), 2)
  );

  const averageSpeedKmph = 22;
  const eta = (distance / averageSpeedKmph) * 60;
  return Math.max(2, Math.round(eta));
}
