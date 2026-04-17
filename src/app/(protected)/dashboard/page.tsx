import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bell, Bus, CarFront, QrCode, TriangleAlert, Users } from "lucide-react";
import { QrScannerCard } from "@/components/attendance/qr-scanner-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { getAlerts } from "@/services/alerts";
import { getClasses } from "@/services/attendance";
import { getDashboardSummary } from "@/services/dashboard";

export default async function DashboardPage() {
  const { profile, supabase, user } = await requireUser();

  if (profile.role === "bus_driver") {
    redirect("/driver");
  }

  const [summary, alerts, classes] = await Promise.all([
    getDashboardSummary(supabase, user.id, profile.role),
    getAlerts(supabase),
    profile.role === "student" ? getClasses(supabase) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
        <p className="text-sm">Welcome back, {profile.name}</p>
        <h1 className="mt-2 text-2xl font-semibold">EDVIX Smart Campus Command Center</h1>
        <p className="mt-2 text-sm text-white/90">
          Role: <span className="font-semibold">{ROLE_LABELS[profile.role]}</span> · Manage attendance,
          transport, alerts, and operations in one place.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Attendance (7d)</CardDescription>
            <CardTitle className="text-2xl">{summary.attendanceCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <QrCode className="text-primary size-4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{profile.role === "student" ? "My Issues" : "Pending Issues"}</CardDescription>
            <CardTitle className="text-2xl">{summary.issuesCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <TriangleAlert className="text-primary size-4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unread Notifications</CardDescription>
            <CardTitle className="text-2xl">{summary.unreadNotifications}</CardTitle>
          </CardHeader>
          <CardContent>
            <Bell className="text-primary size-4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Parking Available</CardDescription>
            <CardTitle className="text-2xl">
              {summary.parking.available}/{summary.parking.total}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <CarFront className="text-primary size-4" />
            <span className="text-muted-foreground text-xs">{summary.parking.utilizationPercent}% occupied</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Users</CardDescription>
            <CardTitle className="text-2xl">{summary.activeUsers}</CardTitle>
          </CardHeader>
          <CardContent>
            <Users className="text-primary size-4" />
          </CardContent>
        </Card>
      </section>

      {profile.role === "student" && (
        <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <QrScannerCard
            classes={classes}
            compact
            title="Live Attendance Scanner"
            description="Scan faculty QR instantly from your dashboard and mark attendance in real time."
          />

          <Card>
            <CardHeader>
              <CardTitle>Real-time Attendance Tips</CardTitle>
              <CardDescription>For faster, error-free check-ins.</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2 text-sm">
              <p>1. Select the class and verify the live subject/topic.</p>
              <p>2. Stay within 9 meters of the faculty QR location and allow location access.</p>
              <p>3. Scan faculty QR or paste token from classroom screen.</p>
              <p>4. Submit once, duplicate marking is blocked automatically.</p>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Jump into core modules.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button asChild variant="outline" className="justify-between">
              <Link href="/attendance">
                QR Attendance
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/transport">
                Bus Tracking
                <Bus className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/parking">
                Parking Monitor
                <CarFront className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/alerts">
                Smart Alerts
                <Bell className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/issues">
                Report Issue
                <TriangleAlert className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Alerts</CardTitle>
            <CardDescription>Realtime campus announcements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-medium">{alert.title}</p>
                  <Badge variant="secondary">{alert.type}</Badge>
                </div>
                <p className="text-muted-foreground text-sm">{alert.message}</p>
              </div>
            ))}
            {!alerts.length && <p className="text-muted-foreground text-sm">No alerts available.</p>}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
