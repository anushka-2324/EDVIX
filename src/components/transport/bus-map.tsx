"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { type Bus } from "@/lib/types";
import { estimateEtaMinutes } from "@/services/buses";

const BusMapLeaflet = dynamic(
  () => import("@/components/transport/bus-map-leaflet").then((module) => module.BusMapLeaflet),
  {
    ssr: false,
    loading: () => <div className="bg-muted h-[420px] w-full animate-pulse rounded-xl border" />,
  }
);

type BusMapProps = {
  buses: Bus[];
};

export function BusMap({ buses }: BusMapProps) {
  const center = useMemo(() => {
    if (!buses.length) {
      return [12.9716, 77.5946] as [number, number];
    }

    return [buses[0].lat, buses[0].lng] as [number, number];
  }, [buses]);

  return (
    <div className="space-y-4">
      <div className="h-[420px] overflow-hidden rounded-xl border">
        <BusMapLeaflet buses={buses} center={center} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {buses.map((bus) => (
          <div key={bus.id} className="bg-card rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium">{bus.name}</p>
              <Badge variant="secondary">ETA {estimateEtaMinutes(bus.lat, bus.lng)}m</Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              Coordinates: {bus.lat.toFixed(5)}, {bus.lng.toFixed(5)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
