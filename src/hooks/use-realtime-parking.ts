"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeParkingLots, PARKING_SLOT_CONFIG, PARKING_VEHICLE_ORDER } from "@/lib/parking";
import { createClient } from "@/lib/supabase/client";
import { type ParkingLot } from "@/lib/types";

export function useRealtimeParking(initialLots: ParkingLot[]) {
  const [lots, setLotsState] = useState<ParkingLot[]>(() => normalizeParkingLots(initialLots));
  const supabase = useMemo(() => createClient(), []);

  const setLots = (nextValue: ParkingLot[] | ((current: ParkingLot[]) => ParkingLot[])) => {
    setLotsState((current) => {
      const nextLots = typeof nextValue === "function" ? nextValue(current) : nextValue;
      return normalizeParkingLots(nextLots);
    });
  };

  useEffect(() => {
    const channel = supabase
      .channel("parking-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "parking_availability" }, async () => {
        const { data } = await supabase
          .from("parking_availability")
          .select("id, zone, total_slots, occupied_slots, updated_at")
          .in(
            "zone",
            PARKING_VEHICLE_ORDER.map((type) => PARKING_SLOT_CONFIG[type].zone)
          )
          .order("zone", { ascending: true });

        if (data) {
          setLots(data as ParkingLot[]);
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  return { lots, setLots };
}
