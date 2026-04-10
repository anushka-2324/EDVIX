"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { type Alert } from "@/lib/types";

export function useRealtimeAlerts(initialAlerts: Alert[]) {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel("alerts-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alerts" }, (payload) => {
        const newAlert = payload.new as Alert;
        setAlerts((current) => [newAlert, ...current]);
        toast.info(`New alert: ${newAlert.title}`);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  return { alerts, setAlerts };
}
