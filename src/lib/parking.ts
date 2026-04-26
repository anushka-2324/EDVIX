import { type ParkingLot, type ParkingVehicleType } from "@/lib/types";

export const PARKING_SLOT_CONFIG: Record<ParkingVehicleType, { label: string; zone: string; totalSlots: number }> = {
  car: {
    label: "Cars",
    zone: "Car Parking",
    totalSlots: 10,
  },
  twoWheeler: {
    label: "2-Wheelers",
    zone: "2-Wheeler Parking",
    totalSlots: 20,
  },
};

export const PARKING_VEHICLE_ORDER: ParkingVehicleType[] = ["car", "twoWheeler"];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function createVirtualParkingLot(type: ParkingVehicleType): ParkingLot {
  const config = PARKING_SLOT_CONFIG[type];

  return {
    id: `virtual-${type}`,
    zone: config.zone,
    total_slots: config.totalSlots,
    occupied_slots: 0,
    updated_at: new Date().toISOString(),
  };
}

export function normalizeParkingLots(lots: ParkingLot[]): ParkingLot[] {
  const lotsByZone = new Map(lots.map((lot) => [lot.zone, lot]));

  return PARKING_VEHICLE_ORDER.map((type) => {
    const config = PARKING_SLOT_CONFIG[type];
    const existing = lotsByZone.get(config.zone);

    if (!existing) {
      return createVirtualParkingLot(type);
    }

    return {
      ...existing,
      total_slots: config.totalSlots,
      occupied_slots: clamp(existing.occupied_slots, 0, config.totalSlots),
    };
  });
}

export function findParkingLotByVehicleType(lots: ParkingLot[], type: ParkingVehicleType) {
  const zone = PARKING_SLOT_CONFIG[type].zone;
  return lots.find((lot) => lot.zone === zone);
}
