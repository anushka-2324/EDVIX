import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { type AttendanceLog } from "@/lib/types";

type AttendanceTableProps = {
  logs: AttendanceLog[];
};

export function AttendanceTable({ logs }: AttendanceTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Logs</CardTitle>
        <CardDescription>Latest check-ins from QR attendance system.</CardDescription>
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
                  <TableCell>{log.class?.name ?? "Unknown Class"}</TableCell>
                  <TableCell>
                    <p className="text-sm">{log.class?.subject ?? "General"}</p>
                    <p className="text-muted-foreground text-xs">{log.class?.current_topic ?? "General attendance"}</p>
                  </TableCell>
                  <TableCell>{formatDateTime(log.timestamp)}</TableCell>
                  <TableCell>
                    <Badge variant="success">Present</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                  No attendance logs yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
