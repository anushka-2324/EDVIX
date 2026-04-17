import { redirect } from "next/navigation";
import { CreateClassSessionCard } from "@/components/attendance/create-class-session-card";
import { FacultyAttendanceManager } from "@/components/attendance/faculty-attendance-manager";
import { QrGeneratorCard } from "@/components/attendance/qr-generator-card";
import { QrScannerCard } from "@/components/attendance/qr-scanner-card";
import { AttendanceTable } from "@/components/attendance/attendance-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getAttendanceLogs, getClasses } from "@/services/attendance";

export default async function AttendancePage() {
  const { supabase, profile, user } = await requireUser();

  if (profile.role === "bus_driver") {
    redirect("/driver");
  }

  const [classes, logs] = await Promise.all([
    getClasses(supabase),
    getAttendanceLogs(supabase, user.id, profile.role),
  ]);

  const currentIso = new Date().toISOString();

  const activeClasses = classes.filter(
    (classItem) => !classItem.qr_expires_at || classItem.qr_expires_at > currentIso
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">QR Attendance System</h1>
        <p className="text-muted-foreground text-sm">
          Dynamic class QR generation with location-verified student check-ins inside the classroom radius.
        </p>
      </div>

      {profile.role === "student" ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <QrScannerCard classes={activeClasses} />
          <Card>
            <CardHeader>
              <CardTitle>How it works</CardTitle>
              <CardDescription>Attendance flow</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2 text-sm">
              <p>1. Select class and verify live subject/topic from faculty session.</p>
              <p>2. Stay within 9 meters of the faculty who generated the QR.</p>
              <p>3. Scan QR token using camera or paste token manually, then allow location access.</p>
              <p>4. Submit once. Duplicate check-ins for same day are blocked.</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
            <CreateClassSessionCard />
            <Card>
              <CardHeader>
                <CardTitle>Faculty QR Customization</CardTitle>
                <CardDescription>Set subject, topic, and expiry for each live attendance session.</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2 text-sm">
                <p>1. Create your class session from the left card.</p>
                <p>2. Generate or refresh the QR only after you are in the classroom so your location is captured.</p>
                <p>3. Use the generated class card to customize subject/topic and rotate QR.</p>
                <p>4. Students farther than 9 meters from your QR origin will be blocked automatically.</p>
              </CardContent>
            </Card>
          </div>

          <FacultyAttendanceManager classes={classes} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeClasses.map((classItem) => (
              <QrGeneratorCard
                key={classItem.id}
                classId={classItem.id}
                className={classItem.name}
                initialToken={classItem.qr_code}
                initialSubject={classItem.subject}
                initialTopic={classItem.current_topic}
                initialExpiry={classItem.qr_expires_at}
              />
            ))}

            {!activeClasses.length && (
              <Card>
                <CardContent className="text-muted-foreground py-6 text-sm">
                  No active QR sessions. Expired sessions are hidden automatically.
                </CardContent>
              </Card>
            )}
          </div>

          {!classes.length && (
            <Card>
              <CardContent className="text-muted-foreground py-6 text-sm">
                No classes yet. Create your first class session to generate and customize attendance QR.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <AttendanceTable logs={logs} role={profile.role} />
    </div>
  );
}
