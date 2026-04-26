import {
  type ParkingAvailabilitySummary,
  type ParkingLot,
  type ParkingVehicleSummary,
  type ParkingVehicleType,
} from "@/lib/types";
import {
  PARKING_SLOT_CONFIG,
  PARKING_VEHICLE_ORDER,
  findParkingLotByVehicleType,
  normalizeParkingLots,
} from "@/lib/parking";
import { isMissingTableError, toDbError } from "@/lib/supabase/errors";

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerSupabaseClient>>;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function needsSync(rawLots: ParkingLot[], normalizedLots: ParkingLot[]) {
  const rawByZone = new Map(rawLots.map((lot) => [lot.zone, lot]));

  return normalizedLots.some((normalized) => {
    const raw = rawByZone.get(normalized.zone);

    if (!raw) {
      return true;
    }

    return raw.total_slots !== normalized.total_slots || raw.occupied_slots !== normalized.occupied_slots;
  });
}

async function fetchCanonicalLots(supabase: SupabaseClient): Promise<ParkingLot[]> {
  const zones = PARKING_VEHICLE_ORDER.map((type) => PARKING_SLOT_CONFIG[type].zone);

  const { data, error } = await supabase
    .from("parking_availability")
    .select("id, zone, total_slots, occupied_slots, updated_at")
    .in("zone", zones)
    .order("zone", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ParkingLot[];
}

function buildSyncPayload(lots: ParkingLot[]) {
  const now = new Date().toISOString();

  return lots.map((lot) => ({
    zone: lot.zone,
    total_slots: lot.total_slots,
    occupied_slots: lot.occupied_slots,
    updated_at: lot.updated_at ?? now,
  }));
}

function summarizeVehicle(type: ParkingVehicleType, lot: ParkingLot | undefined): ParkingVehicleSummary {
  const config = PARKING_SLOT_CONFIG[type];
  const total = config.totalSlots;
  const occupied = clamp(lot?.occupied_slots ?? 0, 0, total);
  const available = Math.max(0, total - occupied);

  return {
    type,
    label: config.label,
    total,
    occupied,
    available,
    utilizationPercent: total > 0 ? Math.round((occupied / total) * 100) : 0,
  };
}

export function getParkingSummary(lots: ParkingLot[]): ParkingAvailabilitySummary {
  const normalized = normalizeParkingLots(lots);
  const car = summarizeVehicle("car", findParkingLotByVehicleType(normalized, "car"));
  const twoWheeler = summarizeVehicle("twoWheeler", findParkingLotByVehicleType(normalized, "twoWheeler"));

  const total = car.total + twoWheeler.total;
  const occupied = car.occupied + twoWheeler.occupied;
  const available = Math.max(0, total - occupied);

  return {
    total,
    occupied,
    available,
    utilizationPercent: total > 0 ? Math.round((occupied / total) * 100) : 0,
    byVehicle: {
      car,
      twoWheeler,
    },
  };
}

export async function getParkingLots(supabase: SupabaseClient) {
  try {
    const rawLots = await fetchCanonicalLots(supabase);
    const normalizedLots = normalizeParkingLots(rawLots);

    if (needsSync(rawLots, normalizedLots)) {
      const { error: syncError } = await supabase
        .from("parking_availability")
        .upsert(buildSyncPayload(normalizedLots), { onConflict: "zone" });

      if (!syncError) {
        const refreshedLots = await fetchCanonicalLots(supabase);
        return normalizeParkingLots(refreshedLots);
      }
    }

    return normalizedLots;
  } catch (error) {
    if (isMissingTableError(error, "parking_availability")) {
      return normalizeParkingLots([]);
    }

    throw toDbError(error, "Unable to load parking availability", "parking_availability");
  }
}

export async function updateParkingOccupancy(
  supabase: SupabaseClient,
  lotId: string,
  occupiedSlots: number
) {
  const lots = await getParkingLots(supabase);
  const targetLot = lots.find((lot) => lot.id === lotId);

  if (!targetLot) {
    throw new Error("Parking zone not found");
  }

  if (occupiedSlots < 0 || occupiedSlots > targetLot.total_slots) {
    throw new Error(`Occupied slots must be between 0 and ${targetLot.total_slots}`);
  }

  const { data, error } = await supabase
    .from("parking_availability")
    .upsert(
      {
        zone: targetLot.zone,
        total_slots: targetLot.total_slots,
        occupied_slots: occupiedSlots,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "zone" }
    )
    .select("id, zone, total_slots, occupied_slots, updated_at")
    .single();

  if (error) {
    throw toDbError(error, "Unable to update parking occupancy", "parking_availability");
  }

  return data as ParkingLot;
}

export async function reserveParkingSlots(
  supabase: SupabaseClient,
  vehicleType: ParkingVehicleType,
  slotsToReserve = 1
) {
  if (!Number.isInteger(slotsToReserve) || slotsToReserve <= 0) {
    throw new Error("Slots to reserve must be a positive integer");
  }

  const lots = await getParkingLots(supabase);
  const targetLot = findParkingLotByVehicleType(lots, vehicleType);

  if (!targetLot) {
    throw new Error("Parking zone not found");
  }

  const available = Math.max(0, targetLot.total_slots - targetLot.occupied_slots);

  if (slotsToReserve > available) {
    throw new Error(`Only ${available} slot(s) available for ${PARKING_SLOT_CONFIG[vehicleType].label.toLowerCase()}`);
  }

  return updateParkingOccupancy(supabase, targetLot.id, targetLot.occupied_slots + slotsToReserve);
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
      zone: lot.zone,
      total_slots: lot.total_slots,
      occupied_slots: nextOccupied,
      updated_at: new Date().toISOString(),
    };
  });

  const { error } = await supabase.from("parking_availability").upsert(updates, { onConflict: "zone" });

  if (error) {
    throw toDbError(error, "Unable to simulate parking updates", "parking_availability");
  }

  return getParkingLots(supabase);
}
