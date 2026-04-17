"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import { type AttendanceLog, type UserRole } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type AttendanceTableProps = {
  logs: AttendanceLog[];
  role: UserRole;
};

export function AttendanceTable({ logs, role }: AttendanceTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusById, setStatusById] = useState<Record<string, "present" | "absent">>({});

  const canEditStatus = role === "faculty" || role === "admin";

  useEffect(() => {
    const next: Record<string, "present" | "absent"> = {};
    for (const log of logs) {
      next[log.id] = log.status;
    }
    setStatusById(next);
  }, [logs]);

  const updateStatus = (attendanceId: string, nextStatus: "present" | "absent") => {
    setStatusById((current) => ({ ...current, [attendanceId]: nextStatus }));

    startTransition(async () => {
      try {
        const res = await fetch(`/api/attendance/${attendanceId}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        });

        const payload = await res.json();

        if (!res.ok) {
          throw new Error(getErrorMessage(payload.error, "Unable to update attendance"));
        }

        toast.success(`Attendance marked ${nextStatus}`);
        router.refresh();
      } catch (error) {
        toast.error(getErrorMessage(error, "Unable to update attendance status"));
        router.refresh();
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Logs</CardTitle>
        <CardDescription>
          {canEditStatus
            ? "Latest attendance entries. Faculty/Admin can edit status directly."
            : "Latest attendance entries from QR and faculty controls."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length ? (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.class?.name ?? "Unknown Class"}</TableCell>
                  <TableCell>
                    <p>{log.class?.subject ?? "General"}</p>
                    <p className="text-muted-foreground text-xs">{log.class?.current_topic ?? "General attendance"}</p>
                  </TableCell>
                  <TableCell>{formatDateTime(log.timestamp)}</TableCell>
                  <TableCell>
                    {canEditStatus ? (
                      <Select
                        id={`attendance-status-${log.id}`}
                        value={statusById[log.id] ?? log.status}
                        onChange={(event) =>
                          updateStatus(log.id, event.target.value as "present" | "absent")
                        }
                        options={[
                          { value: "present", label: "Present" },
                          { value: "absent", label: "Absent" },
                        ]}
                        disabled={isPending}
                      />
                    ) : (
                      <Badge variant={log.status === "absent" ? "destructive" : "success"}>
                        {log.status === "absent" ? "Absent" : "Present"}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                  No attendance logs available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
