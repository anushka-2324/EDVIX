import { BusTracker } from "@/components/transport/bus-tracker";
import { requireUser } from "@/lib/auth";
import { getBuses } from "@/services/buses";

export default async function TransportPage() {
  const { supabase, profile } = await requireUser();
  const buses = await getBuses(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Smart Bus Tracking</h1>
        <p className="text-muted-foreground text-sm">
          Realtime bus movement with ETA, map view, and simulated campus GPS feed.
        </p>
      </div>

      <BusTracker initialBuses={buses} role={profile.role} />
    </div>
  );
}
