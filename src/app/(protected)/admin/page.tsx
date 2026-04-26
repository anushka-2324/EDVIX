import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getDashboardSummary, getAttendanceByClass, getIssueStatusBreakdown } from "@/services/dashboard";

export default async function AdminPage() {
  const { supabase, user } = await requireRole(["admin"]);

  const [summary, attendanceByClass, issueStatus] = await Promise.all([
    getDashboardSummary(supabase, user.id, "admin"),
    getAttendanceByClass(supabase),
    getIssueStatusBreakdown(supabase),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Analytics Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Monitor attendance, issue workflows, and platform usage in one admin console.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Attendance (7d)</CardDescription>
            <CardTitle className="text-2xl">{summary.attendanceCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">Campus check-ins over last week</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Issues</CardDescription>
            <CardTitle className="text-2xl">{summary.issuesCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">Need admin/faculty action</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unread Notifications</CardDescription>
            <CardTitle className="text-2xl">{summary.unreadNotifications}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">Across admin account</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Parking Utilization</CardDescription>
            <CardTitle className="text-2xl">
              {summary.parking.occupied}/{summary.parking.total}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-1 text-xs">
            <p>{summary.parking.utilizationPercent}% occupied overall</p>
            <p>
              Cars {summary.parking.byVehicle.car.occupied}/{summary.parking.byVehicle.car.total} · 2W{" "}
              {summary.parking.byVehicle.twoWheeler.occupied}/{summary.parking.byVehicle.twoWheeler.total}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Users</CardDescription>
            <CardTitle className="text-2xl">{summary.activeUsers}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">Students, faculty, and admins</CardContent>
        </Card>
      </section>

      <AnalyticsCharts attendanceByClass={attendanceByClass} issueStatus={issueStatus} />
    </div>
  );
}
