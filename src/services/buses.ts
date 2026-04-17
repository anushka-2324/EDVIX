import { CAMPUS_CENTER } from "@/lib/constants";
import { type Bus, type PickupSource, type TransportPreference, type UserRole } from "@/lib/types";
import { isMissingColumnError, isMissingTableError, toDbError } from "@/lib/supabase/errors";

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerSupabaseClient>>;

type DriverSessionPayload = {
  driverId: string;
  busId: string;
  busNumber: string;
  pickupArea: string;
  pickupSource: PickupSource;
  lat?: number;
  lng?: number;
};

type LegacyBusRow = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  updated_at: string;
};

const BUS_EXTENDED_COLUMNS = ["bus_number", "pickup_area", "pickup_source", "driver_id"] as const;

function isLegacyBusColumnsError(error: unknown) {
  return BUS_EXTENDED_COLUMNS.some((column) => isMissingColumnError(error, "buses", column));
}

function normalizeBus(row: LegacyBusRow & Partial<Pick<Bus, "bus_number" | "pickup_area" | "pickup_source" | "driver_id">>): Bus {
  return {
    id: row.id,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    updated_at: row.updated_at,
    bus_number: row.bus_number ?? null,
    pickup_area: row.pickup_area ?? null,
    pickup_source: (row.pickup_source ?? null) as PickupSource | null,
    driver_id: row.driver_id ?? null,
  };
}

function defaultPreference(userId: string): TransportPreference {
  return {
    user_id: userId,
    preferred_bus_id: null,
    preferred_area: null,
    preferred_source: null,
    updated_at: new Date().toISOString(),
  };
}

function jitter(value: number, scale = 0.0006) {
  return value + (Math.random() - 0.5) * scale;
}

export function filterBusesByPreference(
  buses: Bus[],
  preference: TransportPreference | null,
  role: UserRole
) {
  if (!preference || role === "bus_driver") {
    return buses;
  }

  return buses.filter((bus) => {
    if (preference.preferred_bus_id && bus.id !== preference.preferred_bus_id) {
      return false;
    }

    if (
      preference.preferred_area &&
      !(bus.pickup_area ?? "").toLowerCase().includes(preference.preferred_area.toLowerCase())
    ) {
      return false;
    }

    if (preference.preferred_source && bus.pickup_source !== preference.preferred_source) {
      return false;
    }

    return true;
  });
}

export async function getBuses(supabase: SupabaseClient) {
  const fullRes = await supabase
    .from("buses")
    .select("id, name, bus_number, lat, lng, updated_at, pickup_area, pickup_source, driver_id")
    .order("name");

  if (!fullRes.error) {
    return (fullRes.data ?? []).map((row) => normalizeBus(row as LegacyBusRow & Partial<Bus>));
  }

  if (isMissingTableError(fullRes.error, "buses")) {
    return [];
  }

  if (isLegacyBusColumnsError(fullRes.error)) {
    const legacyRes = await supabase
      .from("buses")
      .select("id, name, lat, lng, updated_at")
      .order("name");

    if (legacyRes.error) {
      if (isMissingTableError(legacyRes.error, "buses")) {
        return [];
      }

      throw toDbError(legacyRes.error, "Unable to load buses", "buses");
    }

    return (legacyRes.data ?? []).map((row) => normalizeBus(row as LegacyBusRow));
  }

  throw toDbError(fullRes.error, "Unable to load buses", "buses");
}

export async function getDriverAssignedBus(supabase: SupabaseClient, driverId: string) {
  const res = await supabase
    .from("buses")
    .select("id, name, bus_number, lat, lng, updated_at, pickup_area, pickup_source, driver_id")
    .eq("driver_id", driverId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!res.error) {
    return res.data ? normalizeBus(res.data as LegacyBusRow & Partial<Bus>) : null;
  }

  if (isMissingTableError(res.error, "buses") || isLegacyBusColumnsError(res.error)) {
    return null;
  }

  throw toDbError(res.error, "Unable to load driver bus", "buses");
}

export async function getUserTransportPreference(supabase: SupabaseClient, userId: string) {
  const res = await supabase
    .from("transport_preferences")
    .select("user_id, preferred_bus_id, preferred_area, preferred_source, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!res.error) {
    if (!res.data) {
      return defaultPreference(userId);
    }

    return {
      user_id: res.data.user_id,
      preferred_bus_id: res.data.preferred_bus_id,
      preferred_area: res.data.preferred_area,
      preferred_source: (res.data.preferred_source ?? null) as PickupSource | null,
      updated_at: res.data.updated_at,
    } as TransportPreference;
  }

  if (isMissingTableError(res.error, "transport_preferences")) {
    return defaultPreference(userId);
  }

  throw toDbError(res.error, "Unable to load transport preference", "transport_preferences");
}

export async function updateUserTransportPreference(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    preferred_bus_id?: string | null;
    preferred_area?: string | null;
    preferred_source?: PickupSource | null;
  }
) {
  const upsertPayload = {
    user_id: userId,
    preferred_bus_id: payload.preferred_bus_id ?? null,
    preferred_area: payload.preferred_area ?? null,
    preferred_source: payload.preferred_source ?? null,
    updated_at: new Date().toISOString(),
  };

  const res = await supabase
    .from("transport_preferences")
    .upsert(upsertPayload, { onConflict: "user_id" })
    .select("user_id, preferred_bus_id, preferred_area, preferred_source, updated_at")
    .single();

  if (res.error || !res.data) {
    throw toDbError(res.error, "Unable to save transport preference", "transport_preferences");
  }

  return {
    user_id: res.data.user_id,
    preferred_bus_id: res.data.preferred_bus_id,
    preferred_area: res.data.preferred_area,
    preferred_source: (res.data.preferred_source ?? null) as PickupSource | null,
    updated_at: res.data.updated_at,
  } as TransportPreference;
}

export async function upsertDriverBusSession(supabase: SupabaseClient, payload: DriverSessionPayload) {
  const nowIso = new Date().toISOString();

  const clearPreviousAssignment = await supabase
    .from("buses")
    .update({ driver_id: null })
    .eq("driver_id", payload.driverId)
    .neq("id", payload.busId);

  if (clearPreviousAssignment.error && !isLegacyBusColumnsError(clearPreviousAssignment.error)) {
    throw toDbError(clearPreviousAssignment.error, "Unable to update driver bus session", "buses");
  }

  const updatePayload: Record<string, string | number | null> = {
    updated_at: nowIso,
    driver_id: payload.driverId,
    bus_number: payload.busNumber,
    pickup_area: payload.pickupArea,
    pickup_source: payload.pickupSource,
  };

  if (typeof payload.lat === "number" && typeof payload.lng === "number") {
    updatePayload.lat = payload.lat;
    updatePayload.lng = payload.lng;
  }

  const fullRes = await supabase
    .from("buses")
    .update(updatePayload)
    .eq("id", payload.busId)
    .select("id, name, bus_number, lat, lng, updated_at, pickup_area, pickup_source, driver_id")
    .single();

  if (!fullRes.error && fullRes.data) {
    return normalizeBus(fullRes.data as LegacyBusRow & Partial<Bus>);
  }

  if (fullRes.error && !isLegacyBusColumnsError(fullRes.error)) {
    throw toDbError(fullRes.error, "Unable to update driver bus session", "buses");
  }

  const fallbackPayload: Record<string, string | number> = {
    updated_at: nowIso,
  };

  if (typeof payload.lat === "number" && typeof payload.lng === "number") {
    fallbackPayload.lat = payload.lat;
    fallbackPayload.lng = payload.lng;
  }

  const legacyRes = await supabase
    .from("buses")
    .update(fallbackPayload)
    .eq("id", payload.busId)
    .select("id, name, lat, lng, updated_at")
    .single();

  if (legacyRes.error || !legacyRes.data) {
    throw toDbError(legacyRes.error, "Unable to update driver bus session", "buses");
  }

  return normalizeBus({
    ...(legacyRes.data as LegacyBusRow),
    bus_number: payload.busNumber,
    pickup_area: payload.pickupArea,
    pickup_source: payload.pickupSource,
    driver_id: payload.driverId,
  });
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
