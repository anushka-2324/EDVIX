"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useMemo, useState } from "react";
import { ArrowRight, MapPinned, Navigation } from "lucide-react";
import { DEFAULT_CAMPUS_PRESET_ID } from "@/lib/constants";
import { type CampusLocation, type CampusPreset } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const CampusMapLeaflet = dynamic(
  () => import("@/components/navigation/campus-map-leaflet").then((module) => module.CampusMapLeaflet),
  {
    ssr: false,
    loading: () => <div className="bg-muted h-[420px] w-full animate-pulse rounded-xl border" />,
  }
);

type CampusMapProps = {
  presets: CampusPreset[];
};

export function CampusMap({ presets }: CampusMapProps) {
  const defaultPreset = useMemo(
    () => presets.find((preset) => preset.id === DEFAULT_CAMPUS_PRESET_ID) ?? presets[0] ?? null,
    [presets]
  );

  const [selectedPresetId, setSelectedPresetId] = useState(defaultPreset?.id ?? "");
  const [query, setQuery] = useState("");
  const [manualLat, setManualLat] = useState(defaultPreset ? String(defaultPreset.center.lat) : "");
  const [manualLng, setManualLng] = useState(defaultPreset ? String(defaultPreset.center.lng) : "");
  const deferredQuery = useDeferredValue(query);

  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId) ?? defaultPreset,
    [defaultPreset, presets, selectedPresetId]
  );

  const [startLocationId, setStartLocationId] = useState(defaultPreset?.locations[0]?.id ?? "");
  const [destinationLocationId, setDestinationLocationId] = useState(defaultPreset?.locations[1]?.id ?? "");

  const onPresetChange = (nextPresetId: string) => {
    setSelectedPresetId(nextPresetId);

    const nextPreset = presets.find((preset) => preset.id === nextPresetId);
    if (nextPreset) {
      setManualLat(String(nextPreset.center.lat));
      setManualLng(String(nextPreset.center.lng));
      setStartLocationId(nextPreset.locations[0]?.id ?? "");
      setDestinationLocationId(nextPreset.locations[1]?.id ?? nextPreset.locations[0]?.id ?? "");
    }
  };

  const mapCenter = useMemo(() => {
    if (!selectedPreset) {
      return { lat: 0, lng: 0 };
    }

    const lat = Number(manualLat);
    const lng = Number(manualLng);

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return { lat, lng };
    }

    return selectedPreset.center;
  }, [manualLat, manualLng, selectedPreset]);

  const filteredLocations = useMemo(() => {
    if (!selectedPreset) {
      return [];
    }

    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) {
      return selectedPreset.locations;
    }

    return selectedPreset.locations.filter(
      (location) =>
        location.name.toLowerCase().includes(normalized) ||
        location.description.toLowerCase().includes(normalized)
    );
  }, [deferredQuery, selectedPreset]);

  const startLocation = useMemo(
    () => selectedPreset?.locations.find((location) => location.id === startLocationId) ?? null,
    [selectedPreset, startLocationId]
  );

  const destinationLocation = useMemo(
    () => selectedPreset?.locations.find((location) => location.id === destinationLocationId) ?? null,
    [destinationLocationId, selectedPreset]
  );

  const route = useMemo(() => {
    if (!startLocation || !destinationLocation || startLocation.id === destinationLocation.id) {
      return null;
    }

    const midpoint = {
      lat: startLocation.lat,
      lng: destinationLocation.lng,
    };

    return {
      from: startLocation,
      to: destinationLocation,
      points: [
        { lat: startLocation.lat, lng: startLocation.lng },
        midpoint,
        { lat: destinationLocation.lat, lng: destinationLocation.lng },
      ],
    };
  }, [destinationLocation, startLocation]);

  const displayedLocations = useMemo(() => {
    const important = [startLocation, destinationLocation].filter((location): location is CampusLocation => Boolean(location));
    const deduped = new Map<string, CampusLocation>();

    for (const location of [...important, ...filteredLocations]) {
      deduped.set(location.id, location);
    }

    return [...deduped.values()];
  }, [destinationLocation, filteredLocations, startLocation]);

  const directionMeta = useMemo(() => {
    if (!startLocation || !destinationLocation || startLocation.id === destinationLocation.id) {
      return null;
    }

    const metersPerLatDegree = 111_320;
    const avgLatRadians = ((startLocation.lat + destinationLocation.lat) / 2) * (Math.PI / 180);
    const metersPerLngDegree = 111_320 * Math.cos(avgLatRadians);
    const northMeters = (destinationLocation.lat - startLocation.lat) * metersPerLatDegree;
    const eastMeters = (destinationLocation.lng - startLocation.lng) * metersPerLngDegree;
    const totalDistance = Math.round(Math.hypot(northMeters, eastMeters));
    const walkMinutes = Math.max(1, Math.ceil(totalDistance / 80));

    const primaryDirection =
      Math.abs(northMeters) >= Math.abs(eastMeters)
        ? northMeters >= 0
          ? "north"
          : "south"
        : eastMeters >= 0
          ? "east"
          : "west";

    const secondaryDirection =
      Math.abs(northMeters) < 15 || Math.abs(eastMeters) < 15
        ? null
        : Math.abs(northMeters) >= Math.abs(eastMeters)
          ? eastMeters >= 0
            ? "east"
            : "west"
          : northMeters >= 0
            ? "north"
            : "south";

    const heading = secondaryDirection ? `${primaryDirection}-${secondaryDirection}` : primaryDirection;

    return {
      totalDistance,
      walkMinutes,
      heading,
      northMeters: Math.round(Math.abs(northMeters)),
      eastMeters: Math.round(Math.abs(eastMeters)),
    };
  }, [destinationLocation, startLocation]);

  const directionSteps = useMemo(() => {
    if (!startLocation || !destinationLocation || !directionMeta) {
      return [];
    }

    return [
      `Start at ${startLocation.name}. ${startLocation.navigationHint ?? startLocation.description}`,
      directionMeta.northMeters > 15
        ? `Walk ${destinationLocation.lat >= startLocation.lat ? "north" : "south"} for about ${directionMeta.northMeters} meters through the main campus path.`
        : `Stay on the same north-south lane and continue ahead.`,
      directionMeta.eastMeters > 15
        ? `Then turn ${destinationLocation.lng >= startLocation.lng ? "east" : "west"} and continue for about ${directionMeta.eastMeters} meters.`
        : `You will not need a major east-west turn for this route.`,
      `Arrive at ${destinationLocation.name}. ${destinationLocation.navigationHint ?? destinationLocation.description}`,
    ];
  }, [destinationLocation, directionMeta, startLocation]);

  const externalDirectionsUrl = useMemo(() => {
    if (!startLocation || !destinationLocation || startLocation.id === destinationLocation.id) {
      return null;
    }

    const params = new URLSearchParams({
      api: "1",
      origin: `${startLocation.lat},${startLocation.lng}`,
      destination: `${destinationLocation.lat},${destinationLocation.lng}`,
      travelmode: "walking",
    });

    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }, [destinationLocation, startLocation]);

  if (!selectedPreset) {
    return <p className="text-muted-foreground text-sm">No campus presets configured.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1 md:col-span-1">
          <Label htmlFor="campus-preset">College</Label>
          <Select
            id="campus-preset"
            value={selectedPreset.id}
            onChange={(event) => onPresetChange(event.target.value)}
            options={presets.map((preset) => ({
              value: preset.id,
              label: preset.name,
            }))}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="campus-lat">Map Latitude</Label>
          <Input
            id="campus-lat"
            value={manualLat}
            onChange={(event) => setManualLat(event.target.value)}
            placeholder="19.0768"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="campus-lng">Map Longitude</Label>
          <Input
            id="campus-lng"
            value={manualLng}
            onChange={(event) => setManualLng(event.target.value)}
            placeholder="72.9974"
          />
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        Select a college preset or set custom coordinates to adjust the map center.
      </p>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <div className="space-y-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search buildings, labs, staff rooms, parking"
          />

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="route-start">Starting Point</Label>
              <Select
                id="route-start"
                value={startLocationId}
                onChange={(event) => setStartLocationId(event.target.value)}
                options={selectedPreset.locations.map((location) => ({
                  value: location.id,
                  label: location.name,
                }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="route-destination">Destination</Label>
              <Select
                id="route-destination"
                value={destinationLocationId}
                onChange={(event) => setDestinationLocationId(event.target.value)}
                options={selectedPreset.locations.map((location) => ({
                  value: location.id,
                  label: location.name,
                }))}
              />
            </div>
          </div>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Directions</p>
                <p className="text-muted-foreground text-xs">
                  Choose a starting point and destination to get a campus walking route.
                </p>
              </div>
              {directionMeta ? <Badge variant="secondary">{directionMeta.walkMinutes} min walk</Badge> : null}
            </div>

            {startLocation && destinationLocation ? (
              startLocation.id === destinationLocation.id ? (
                <p className="text-muted-foreground text-sm">
                  Select two different places to generate turn-by-turn directions.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MapPinned className="h-4 w-4" />
                    <span>{startLocation.name}</span>
                    <ArrowRight className="text-muted-foreground h-4 w-4" />
                    <span>{destinationLocation.name}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{directionMeta?.totalDistance} m</Badge>
                    <Badge variant="outline">Head {directionMeta?.heading}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {destinationLocation.type}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    {directionSteps.map((step, index) => (
                      <div key={`${index}-${step}`} className="flex gap-3">
                        <Badge variant="secondary" className="mt-0.5 h-fit min-w-6 justify-center px-2">
                          {index + 1}
                        </Badge>
                        <p className="text-sm leading-6">{step}</p>
                      </div>
                    ))}
                  </div>

                  {externalDirectionsUrl ? (
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <a href={externalDirectionsUrl} target="_blank" rel="noreferrer">
                        <Navigation className="mr-2 h-4 w-4" />
                        Open In Google Maps
                      </a>
                    </Button>
                  ) : null}
                </div>
              )
            ) : (
              <p className="text-muted-foreground text-sm">Select a route to view directions.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="h-[420px] overflow-hidden rounded-xl border">
        <CampusMapLeaflet
          key={`${selectedPreset.id}-${mapCenter.lat.toFixed(6)}-${mapCenter.lng.toFixed(6)}`}
          locations={displayedLocations}
          center={mapCenter}
          route={route}
          zoom={selectedPreset.zoom ?? 16}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {displayedLocations.map((location) => (
          <div key={location.id} className="bg-card rounded-lg border p-3">
            <p className="font-medium">{location.name}</p>
            <p className="text-muted-foreground text-xs capitalize">{location.type}</p>
            <p className="text-muted-foreground mt-2 text-xs">{location.description}</p>
            {location.navigationHint ? (
              <p className="text-muted-foreground mt-2 text-xs">{location.navigationHint}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
