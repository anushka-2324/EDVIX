import { type ParkingLot, type ParkingAvailabilitySummary } from "@/lib/types";
import { isMissingTableError, toDbError } from "@/lib/supabase/errors";

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerSupabaseClient>>;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getParkingSummary(lots: ParkingLot[]): ParkingAvailabilitySummary {
  const { total, occupied } = lots.reduce(
    (acc, lot) => {
      acc.total += lot.total_slots;
      acc.occupied += lot.occupied_slots;
      return acc;
    },
    { total: 0, occupied: 0 }
  );

  const available = Math.max(0, total - occupied);

  return {
    total,
    occupied,
    available,
    utilizationPercent: total > 0 ? Math.round((occupied / total) * 100) : 0,
  };
}

export async function getParkingLots(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("parking_availability")
    .select("id, zone, total_slots, occupied_slots, updated_at")
    .order("zone", { ascending: true });

  if (error) {
    if (isMissingTableError(error, "parking_availability")) {
      return [];
    }

    throw toDbError(error, "Unable to load parking availability", "parking_availability");
  }

  return (data ?? []) as ParkingLot[];
}

export async function updateParkingOccupancy(
  supabase: SupabaseClient,
  lotId: string,
  occupiedSlots: number
) {
  const { data: current, error: currentError } = await supabase
    .from("parking_availability")
    .select("id, total_slots")
    .eq("id", lotId)
    .single();

  if (currentError || !current) {
    throw new Error("Parking zone not found");
  }

  if (occupiedSlots < 0 || occupiedSlots > current.total_slots) {
    throw new Error(`Occupied slots must be between 0 and ${current.total_slots}`);
  }

  const { data, error } = await supabase
    .from("parking_availability")
    .update({ occupied_slots: occupiedSlots, updated_at: new Date().toISOString() })
    .eq("id", lotId)
    .select("id, zone, total_slots, occupied_slots, updated_at")
    .single();

  if (error) {
    throw toDbError(error, "Unable to update parking occupancy", "parking_availability");
  }

  return data as ParkingLot;
}

export async function simulateParking(supabase: SupabaseClient) {
  const lots = await getParkingLots(supabase);

  if (!lots.length) {
    return [];
  }

  const updates = lots.map((lot) => {
    const swing = Math.floor(Math.random() * 9) - 4;
    const nextOccupied = clamp(lot.occupied_slots + swing, 0, lot.total_slots);

    return {
      id: lot.id,
      occupied_slots: nextOccupied,
      updated_at: new Date().toISOString(),
    };
  });

  const { error } = await supabase.from("parking_availability").upsert(updates, { onConflict: "id" });

  if (error) {
    throw toDbError(error, "Unable to simulate parking updates", "parking_availability");
  }

  return getParkingLots(supabase);
}
