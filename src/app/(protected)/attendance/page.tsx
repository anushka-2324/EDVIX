import { redirect } from "next/navigation";
import { CreateClassSessionCard } from "@/components/attendance/create-class-session-card";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">QR Attendance System</h1>
        <p className="text-muted-foreground text-sm">
          Dynamic class QR generation, secure student scan, and duplicate-safe check-ins.
        </p>
      </div>

      {profile.role === "student" ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <QrScannerCard classes={classes} />
          <Card>
            <CardHeader>
              <CardTitle>How it works</CardTitle>
              <CardDescription>Attendance flow</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2 text-sm">
              <p>1. Select class and verify live subject/topic from faculty session.</p>
              <p>2. Scan QR token using camera or paste token manually.</p>
              <p>3. Submit once. Duplicate check-ins for same day are blocked.</p>
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
                <p>2. Use the generated class card to customize subject/topic and rotate QR.</p>
                <p>3. Students can scan from Attendance or Dashboard in real time.</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {classes.map((classItem) => (
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

      <AttendanceTable logs={logs} />
    </div>
  );
}
