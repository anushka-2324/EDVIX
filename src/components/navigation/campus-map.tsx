"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { type CampusLocation } from "@/lib/types";
import { Input } from "@/components/ui/input";

const CampusMapLeaflet = dynamic(
  () => import("@/components/navigation/campus-map-leaflet").then((module) => module.CampusMapLeaflet),
  {
    ssr: false,
    loading: () => <div className="bg-muted h-[420px] w-full animate-pulse rounded-xl border" />,
  }
);

type CampusMapProps = {
  locations: CampusLocation[];
};

export function CampusMap({ locations }: CampusMapProps) {
  const [query, setQuery] = useState("");

  const filteredLocations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return locations;
    }

    return locations.filter(
      (location) =>
        location.name.toLowerCase().includes(normalized) ||
        location.description.toLowerCase().includes(normalized)
    );
  }, [locations, query]);

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search buildings or landmarks"
      />

      <div className="h-[420px] overflow-hidden rounded-xl border">
        <CampusMapLeaflet locations={filteredLocations} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filteredLocations.map((location) => (
          <div key={location.id} className="bg-card rounded-lg border p-3">
            <p className="font-medium">{location.name}</p>
            <p className="text-muted-foreground text-xs capitalize">{location.type}</p>
            <p className="text-muted-foreground mt-2 text-xs">{location.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
