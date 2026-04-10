"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type ParkingLot } from "@/lib/types";

export function useRealtimeParking(initialLots: ParkingLot[]) {
  const [lots, setLots] = useState<ParkingLot[]>(initialLots);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel("parking-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "parking_availability" }, async () => {
        const { data } = await supabase
          .from("parking_availability")
          .select("id, zone, total_slots, occupied_slots, updated_at")
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
