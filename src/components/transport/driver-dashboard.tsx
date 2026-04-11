"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { LocateFixed, Loader2, Navigation, Save, Square } from "lucide-react";
import { toast } from "sonner";
import { BusMap } from "@/components/transport/bus-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useRealtimeBuses } from "@/hooks/use-realtime-buses";
import { type Bus, type PickupSource } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type DriverDashboardProps = {
  initialBuses: Bus[];
  initialAssignedBus: Bus | null;
};

export function DriverDashboard({ initialBuses, initialAssignedBus }: DriverDashboardProps) {
  const { buses, setBuses } = useRealtimeBuses(initialBuses);
  const [busId, setBusId] = useState(initialAssignedBus?.id ?? initialBuses[0]?.id ?? "");
  const [pickupArea, setPickupArea] = useState(initialAssignedBus?.pickup_area ?? "");
  const [pickupSource, setPickupSource] = useState<PickupSource>(initialAssignedBus?.pickup_source ?? "college");
  const [isSharing, setIsSharing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(initialAssignedBus?.updated_at ?? null);
  const [isPending, startTransition] = useTransition();
  const watchIdRef = useRef<number | null>(null);

  const selectedBus = useMemo(() => buses.find((bus) => bus.id === busId) ?? null, [buses, busId]);

  const applyUpdatedBus = (updated: Bus) => {
    setBuses((current) =>
      current.map((bus) =>
        bus.id === updated.id
          ? updated
          : bus.driver_id === updated.driver_id
            ? { ...bus, driver_id: null }
            : bus
      )
    );
    setLastSyncedAt(updated.updated_at);
  };

  const syncDriverSession = (coords?: { latitude: number; longitude: number }) => {
    if (!busId) {
      toast.error("Select a bus number first");
      return;
    }

    if (!pickupArea.trim()) {
      toast.error("Pickup area is required");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/driver/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bus_id: busId,
            pickup_area: pickupArea.trim(),
            pickup_source: pickupSource,
            lat: coords?.latitude,
            lng: coords?.longitude,
          }),
        });

        const payload = await res.json();

        if (!res.ok) {
          throw new Error(payload.error ?? "Unable to update driver session");
        }

        applyUpdatedBus(payload.data as Bus);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to sync location");
      }
    });
  };

  const startLiveSharing = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported in this browser");
      return;
    }

    syncDriverSession();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        syncDriverSession({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        toast.error("Could not access current location. Check location permission.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        syncDriverSession({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        toast.error("Live tracking paused due to location permission/device issue");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 12000,
      }
    );

    watchIdRef.current = watchId;
    setIsSharing(true);
    toast.success("Live location sharing started");
  };

  const stopLiveSharing = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setIsSharing(false);
    toast.success("Live location sharing stopped");
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Driver Route Setup</CardTitle>
          <CardDescription>Select your bus number and pickup area, then share live location.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="driver-bus">Bus Number</Label>
            <Select
              id="driver-bus"
              value={busId}
              onChange={(event) => setBusId(event.target.value)}
              options={buses.map((bus) => ({ value: bus.id, label: bus.name }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickup-source">Pickup Source</Label>
            <Select
              id="pickup-source"
              value={pickupSource}
              onChange={(event) => setPickupSource(event.target.value as PickupSource)}
              options={[
                { value: "college", label: "College" },
                { value: "school", label: "School" },
              ]}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="pickup-area">Pickup Area</Label>
            <Input
              id="pickup-area"
              value={pickupArea}
              onChange={(event) => setPickupArea(event.target.value)}
              placeholder="North Gate / City Center / Sector 12"
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => syncDriverSession()} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              Save Route Settings
            </Button>

            {!isSharing ? (
              <Button type="button" onClick={startLiveSharing} disabled={isPending}>
                <Navigation className="mr-2 size-4" />
                Start Live Location
              </Button>
            ) : (
              <Button type="button" variant="destructive" onClick={stopLiveSharing}>
                <Square className="mr-2 size-4" />
                Stop Live Location
              </Button>
            )}
          </div>

          <div className="md:col-span-2 text-muted-foreground text-sm space-y-1">
            <p>
              Active bus: <span className="font-medium text-foreground">{selectedBus?.name ?? "Not selected"}</span>
            </p>
            <p>
              Last sync: {lastSyncedAt ? formatDateTime(lastSyncedAt) : "Not synced yet"}
            </p>
            {selectedBus?.pickup_area && (
              <p>
                Route: {selectedBus.pickup_area} ({selectedBus.pickup_source ?? "college"})
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Live Bus Location</CardTitle>
          <CardDescription>
            This location is visible to faculty, students, and admins based on their selected bus/area preference.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusMap buses={selectedBus ? [selectedBus] : []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Driver Guidance</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>1. Choose your assigned bus number and pickup source (college/school).</p>
          <p>2. Enter pickup area where students will board.</p>
          <p>3. Start live location sharing while driving to keep ETA accurate for everyone.</p>
          <p className="inline-flex items-center gap-2">
            <LocateFixed className="size-4" />
            Keep browser tab open for continuous live tracking.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
