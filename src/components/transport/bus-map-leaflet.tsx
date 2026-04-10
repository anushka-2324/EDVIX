"use client";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { type Bus } from "@/lib/types";
import { estimateEtaMinutes } from "@/services/buses";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type BusMapLeafletProps = {
  buses: Bus[];
  center: [number, number];
};

export function BusMapLeaflet({ buses, center }: BusMapLeafletProps) {
  return (
    <MapContainer center={center} zoom={15} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {buses.map((bus) => (
        <Marker key={bus.id} position={[bus.lat, bus.lng]} icon={markerIcon}>
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">{bus.name}</p>
              <p className="text-xs">ETA: {estimateEtaMinutes(bus.lat, bus.lng)} mins</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
