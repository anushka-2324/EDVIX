import { AlertsFeed } from "@/components/alerts/alerts-feed";
import { requireUser } from "@/lib/auth";
import { getAlerts, getNotifications } from "@/services/alerts";

export default async function AlertsPage() {
  const { supabase, profile, user } = await requireUser();
  const [alerts, notifications] = await Promise.all([
    getAlerts(supabase),
    getNotifications(supabase, user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Smart Alerts Center</h1>
        <p className="text-muted-foreground text-sm">
          Live class updates, bus notifications, and campus-wide announcements.
        </p>
      </div>

      <AlertsFeed role={profile.role} initialAlerts={alerts} initialNotifications={notifications} />
    </div>
  );
}
