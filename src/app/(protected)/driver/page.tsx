import { DriverDashboard } from "@/components/transport/driver-dashboard";
import { requireRole } from "@/lib/auth";
import { getBuses, getDriverAssignedBus } from "@/services/buses";

export default async function DriverPage() {
  const { supabase, user } = await requireRole(["bus_driver"]);

  const [buses, assignedBus] = await Promise.all([
    getBuses(supabase),
    getDriverAssignedBus(supabase, user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bus Driver Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Select bus number + pickup area, then share live location for students, faculty, and admins.
        </p>
      </div>

      <DriverDashboard initialBuses={buses} initialAssignedBus={assignedBus} />
    </div>
  );
}
