"use client";

import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { type CampusLocation } from "@/lib/types";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type CampusMapLeafletProps = {
  locations: CampusLocation[];
  center: {
    lat: number;
    lng: number;
  };
  route?: {
    from: CampusLocation;
    to: CampusLocation;
    points: Array<{
      lat: number;
      lng: number;
    }>;
  } | null;
  zoom?: number;
};

function MapViewport({
  center,
  zoom,
  route,
}: Pick<CampusMapLeafletProps, "center" | "zoom" | "route">) {
  const map = useMap();

  if (route) {
    const bounds = L.latLngBounds(
      route.points.map((point) => [point.lat, point.lng] as [number, number])
    );
    map.fitBounds(bounds.pad(0.2));
    return null;
  }

  map.setView([center.lat, center.lng], zoom ?? 16);
  return null;
}

export function CampusMapLeaflet({ locations, center, route, zoom = 16 }: CampusMapLeafletProps) {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={zoom} className="h-full w-full">
      <MapViewport center={center} route={route} zoom={zoom} />

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {route ? (
        <Polyline
          positions={route.points.map((point) => [point.lat, point.lng] as [number, number])}
          pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.85 }}
        />
      ) : null}

      {locations.map((location) => (
        <Marker key={location.id} position={[location.lat, location.lng]} icon={markerIcon}>
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">{location.name}</p>
              <p className="text-xs capitalize">{location.type}</p>
              <p className="text-xs">{location.description}</p>
              {location.navigationHint ? <p className="text-xs">{location.navigationHint}</p> : null}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
