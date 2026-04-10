"use client";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { CAMPUS_CENTER } from "@/lib/constants";
import { type CampusLocation } from "@/lib/types";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type CampusMapLeafletProps = {
  locations: CampusLocation[];
};

export function CampusMapLeaflet({ locations }: CampusMapLeafletProps) {
  return (
    <MapContainer center={[CAMPUS_CENTER.lat, CAMPUS_CENTER.lng]} zoom={16} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {locations.map((location) => (
        <Marker key={location.id} position={[location.lat, location.lng]} icon={markerIcon}>
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">{location.name}</p>
              <p className="text-xs capitalize">{location.type}</p>
              <p className="text-xs">{location.description}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
