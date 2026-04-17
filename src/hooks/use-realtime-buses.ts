"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Bus } from "@/lib/types";

export function useRealtimeBuses(initialBuses: Bus[]) {
  const [buses, setBuses] = useState<Bus[]>(initialBuses);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Proactive fetch to recover if SSR failed or served stale empty state
    const fetchBusesData = async () => {
      const { data, error } = await supabase.from("buses").select("*").order("name", { ascending: true });
      if (error) {
        console.error("[useRealtimeBuses Debug] Failed to fetch route data via API:", error);
      } else if (data) {
        console.log("[useRealtimeBuses Debug] Client-side fetch returned:", data);
        setBuses(data as Bus[]);
      }
    };
    
    fetchBusesData();

    const channel = supabase
      .channel("buses-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "buses" }, async () => {
        console.log("[useRealtimeBuses Debug] Realtime DB change detected. Refetching...");
        fetchBusesData();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  return { buses, setBuses };
}
