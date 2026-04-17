"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/errors";
import { type CampusClass } from "@/lib/types";

type StudentOption = {
  id: string;
  name: string;
  email: string;
};

type FacultyAttendanceManagerProps = {
  classes: CampusClass[];
};

export function FacultyAttendanceManager({ classes }: FacultyAttendanceManagerProps) {
  const router = useRouter();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState<"present" | "absent">("absent");
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;

    const loadStudents = async () => {
      try {
        const res = await fetch("/api/attendance/manual");
        const payload = await res.json();

        if (!res.ok) {
          throw new Error(getErrorMessage(payload.error, "Unable to load students"));
        }

        if (!active) {
          return;
        }

        const options = (payload.data as StudentOption[]) ?? [];
        setStudents(options);
        setStudentId((current) => current || options[0]?.id || "");
      } catch (error) {
        toast.error(getErrorMessage(error, "Unable to load students list"));
      }
    };

    void loadStudents();

    return () => {
      active = false;
    };
  }, []);

  const classOptions = useMemo(
    () =>
      classes.map((classItem) => ({
        value: classItem.id,
        label: `${classItem.name} · ${classItem.subject}`,
      })),
    [classes]
  );

  const studentOptions = useMemo(
    () =>
      students.map((student) => ({
        value: student.id,
        label: `${student.name} (${student.email})`,
      })),
    [students]
  );

  const saveStatus = () => {
    if (!classId || !studentId) {
      toast.error("Class and student are required");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/attendance/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classId,
            studentId,
            status,
            attendanceDate,
          }),
        });

        const payload = await res.json();

        if (!res.ok) {
          throw new Error(getErrorMessage(payload.error, "Unable to save attendance"));
        }

        toast.success(`Attendance marked ${status} successfully`);
        router.refresh();
      } catch (error) {
        toast.error(getErrorMessage(error, "Unable to save attendance status"));
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Faculty Attendance Control</CardTitle>
        <CardDescription>Mark student attendance as present or absent manually.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="manual-class">Class</Label>
          <Select
            id="manual-class"
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
            options={classOptions.length ? classOptions : [{ value: "", label: "No classes found" }]}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="manual-student">Student</Label>
          <Select
            id="manual-student"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            options={studentOptions.length ? studentOptions : [{ value: "", label: "No students found" }]}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="manual-status">Status</Label>
            <Select
              id="manual-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as "present" | "absent")}
              options={[
                { value: "present", label: "Present" },
                { value: "absent", label: "Absent" },
              ]}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="manual-date">Date</Label>
            <Input
              id="manual-date"
              type="date"
              value={attendanceDate}
              onChange={(event) => setAttendanceDate(event.target.value)}
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={saveStatus}
          disabled={isPending || !classId || !studentId || !attendanceDate}
          className="w-full"
        >
          <CheckCircle2 className="mr-2 size-4" />
          Save Attendance Status
        </Button>
      </CardContent>
    </Card>
  );
}
