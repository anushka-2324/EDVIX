"use client";

import { useMemo, useState, useTransition } from "react";
import { RefreshCw, Save, X } from "lucide-react";
import { toast } from "sonner";
import { BusMap } from "@/components/transport/bus-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useRealtimeBuses } from "@/hooks/use-realtime-buses";
import { getErrorMessage } from "@/lib/errors";
import { type Bus, type PickupSource, type TransportPreference, type UserRole } from "@/lib/types";

type BusTrackerProps = {
  initialBuses: Bus[];
  role: UserRole;
  initialPreference: TransportPreference | null;
};

export function BusTracker({ initialBuses, role, initialPreference }: BusTrackerProps) {
  const { buses, setBuses } = useRealtimeBuses(initialBuses);
  const [isPending, startTransition] = useTransition();

  const [preferredBusId, setPreferredBusId] = useState(initialPreference?.preferred_bus_id ?? "");
  const [preferredArea, setPreferredArea] = useState(initialPreference?.preferred_area ?? "");
  const [preferredSource, setPreferredSource] = useState<PickupSource | "">(
    initialPreference?.preferred_source ?? ""
  );

  const filteredBuses = useMemo(() => {
    return buses.filter((bus) => {
      if (preferredBusId && bus.id !== preferredBusId) {
        return false;
      }

      if (preferredArea && !(bus.pickup_area ?? "").toLowerCase().includes(preferredArea.toLowerCase())) {
        return false;
      }

      if (preferredSource && bus.pickup_source !== preferredSource) {
        return false;
      }

      return true;
    });
  }, [buses, preferredBusId, preferredArea, preferredSource]);

  const canSimulate = role === "admin" || role === "faculty";

  const triggerSimulation = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/buses/simulate", { method: "POST" });
        const payload = await res.json();

        if (!res.ok) {
          throw new Error(getErrorMessage(payload.error, "Failed to update buses"));
        }

        setBuses(payload.data as Bus[]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to fetch updates");
      }
    });
  };

  const savePreference = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/transport/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            preferred_bus_id: preferredBusId || null,
            preferred_area: preferredArea.trim() || null,
            preferred_source: preferredSource || null,
          }),
        });

        const payload = await res.json();

        if (!res.ok) {
          throw new Error(getErrorMessage(payload.error, "Unable to save preference"));
        }

        toast.success("Transport preference saved");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save preference");
      }
    });
  };

  const clearPreference = () => {
    setPreferredBusId("");
    setPreferredArea("");
    setPreferredSource("");

    startTransition(async () => {
      try {
        await fetch("/api/transport/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            preferred_bus_id: null,
            preferred_area: null,
            preferred_source: null,
          }),
        });
      } catch {
        // silent reset failure
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Live Campus Bus Tracking</CardTitle>
          <CardDescription>
            Driver live location visibility based on your selected bus number and pickup area.
          </CardDescription>
        </div>

        {canSimulate && (
          <Button type="button" variant="outline" onClick={triggerSimulation} disabled={isPending}>
            <RefreshCw className={`mr-2 size-4 ${isPending ? "animate-spin" : ""}`} />
            Simulate GPS Tick
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1.1fr_1fr_1fr_auto_auto] md:items-end">
          <div className="space-y-1">
            <Label htmlFor="pref-bus">Preferred Bus Number</Label>
            <Select
              id="pref-bus"
              value={preferredBusId}
              onChange={(event) => setPreferredBusId(event.target.value)}
              options={[
                { value: "", label: "All buses" },
                ...buses.map((bus) => ({ 
                  value: bus.id, 
                  label: bus.bus_number ? `${bus.name} (Vehicle: ${bus.bus_number})` : bus.name 
                })),
              ]}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="pref-area">Preferred Pickup Area</Label>
            <Input
              id="pref-area"
              value={preferredArea}
              onChange={(event) => setPreferredArea(event.target.value)}
              placeholder="City Center"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="pref-source">From</Label>
            <Select
              id="pref-source"
              value={preferredSource}
              onChange={(event) => setPreferredSource(event.target.value as PickupSource | "")}
              options={[
                { value: "", label: "College + School" },
                { value: "college", label: "College" },
                { value: "school", label: "School" },
              ]}
            />
          </div>

          <Button type="button" variant="outline" onClick={savePreference} disabled={isPending}>
            <Save className="mr-2 size-4" />
            Save
          </Button>

          <Button type="button" variant="ghost" onClick={clearPreference} disabled={isPending}>
            <X className="mr-2 size-4" />
            Clear
          </Button>
        </div>

        <BusMap buses={filteredBuses} />
      </CardContent>
    </Card>
  );
}
