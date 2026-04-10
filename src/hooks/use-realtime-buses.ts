"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Bus } from "@/lib/types";

export function useRealtimeBuses(initialBuses: Bus[]) {
  const [buses, setBuses] = useState<Bus[]>(initialBuses);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel("buses-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "buses" }, async () => {
        const { data } = await supabase.from("buses").select("*").order("name", { ascending: true });
        if (data) {
          setBuses(data as Bus[]);
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  return { buses, setBuses };
}
