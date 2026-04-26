import { ParkingManager } from "@/components/parking/parking-manager";
import { requireUser } from "@/lib/auth";
import { getParkingLots } from "@/services/parking";

export default async function ParkingPage() {
  const { supabase, profile } = await requireUser();
  const parkingLots = await getParkingLots(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Smart Parking Monitor</h1>
        <p className="text-muted-foreground text-sm">
          Track live utilization for Cars (10) and 2-Wheelers (20) and reserve slots in real time.
        </p>
      </div>

      <ParkingManager initialLots={parkingLots} role={profile.role} />
    </div>
  );
}
