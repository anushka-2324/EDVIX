import { redirect } from "next/navigation";
import { BusTracker } from "@/components/transport/bus-tracker";
import { requireUser } from "@/lib/auth";
import { getBuses, getUserTransportPreference } from "@/services/buses";

export default async function TransportPage() {
  const { supabase, profile, user } = await requireUser();

  if (profile.role === "bus_driver") {
    redirect("/driver");
  }

  const [buses, preference] = await Promise.all([
    getBuses(supabase),
    getUserTransportPreference(supabase, user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Smart Bus Tracking</h1>
        <p className="text-muted-foreground text-sm">
          Realtime bus movement with ETA, live driver location, and preference-based bus visibility.
        </p>
      </div>

      <BusTracker initialBuses={buses} role={profile.role} initialPreference={preference} />
    </div>
  );
}
