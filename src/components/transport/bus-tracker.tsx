"use client";

import { useEffect, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { BusMap } from "@/components/transport/bus-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRealtimeBuses } from "@/hooks/use-realtime-buses";
import { type Bus, type UserRole } from "@/lib/types";

type BusTrackerProps = {
  initialBuses: Bus[];
  role: UserRole;
};

export function BusTracker({ initialBuses, role }: BusTrackerProps) {
  const { buses, setBuses } = useRealtimeBuses(initialBuses);
  const [isPending, startTransition] = useTransition();

  const triggerSimulation = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/buses/simulate", { method: "POST" });
        const payload = await res.json();

        if (!res.ok) {
          throw new Error(payload.error ?? "Failed to update buses");
        }

        setBuses(payload.data as Bus[]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to fetch updates");
      }
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      void fetch("/api/buses/simulate", { method: "POST" }).catch(() => undefined);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Live Campus Bus Tracking</CardTitle>
          <CardDescription>Realtime location and ETA with simulated GPS movement.</CardDescription>
        </div>

        {(role === "admin" || role === "faculty") && (
          <Button type="button" variant="outline" onClick={triggerSimulation} disabled={isPending}>
            <RefreshCw className={`mr-2 size-4 ${isPending ? "animate-spin" : ""}`} />
            Simulate GPS Tick
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <BusMap buses={buses} />
      </CardContent>
    </Card>
  );
}
