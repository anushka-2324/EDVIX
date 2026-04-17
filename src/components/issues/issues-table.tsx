"use client";

import { useState, useTransition } from "react";
import { History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import { type Issue, type UserRole } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type IssueHistoryEntry = {
  id: string;
  previous_status: string | null;
  new_status: string;
  note: string | null;
  changed_at: string;
};

type IssuesTableProps = {
  role: UserRole;
  issues: Issue[];
};

export function IssuesTable({ role, issues }: IssuesTableProps) {
  const router = useRouter();
  const [history, setHistory] = useState<Record<string, IssueHistoryEntry[]>>({});
  const [isPending, startTransition] = useTransition();

  const canResolve = role === "admin" || role === "faculty";

  const updateStatus = (issueId: string, status: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/issues/${issueId}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });

        const payload = await res.json();
        if (!res.ok) {
          throw new Error(getErrorMessage(payload.error, "Unable to update issue status"));
        }

        toast.success("Issue status updated");
        router.refresh();
      } catch (error) {
        toast.error(getErrorMessage(error, "Status update failed"));
      }
    });
  };

  const loadHistory = (issueId: string) => {
    if (history[issueId]) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/issues/${issueId}`);
        const payload = await res.json();

        if (!res.ok) {
          throw new Error(getErrorMessage(payload.error, "Unable to load history"));
        }

        setHistory((current) => ({ ...current, [issueId]: payload.history as IssueHistoryEntry[] }));
      } catch (error) {
        toast.error(getErrorMessage(error, "Could not fetch history"));
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issue Tracker</CardTitle>
        <CardDescription>Track pending and resolved campus issues with history.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Issue</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>History</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.length ? (
              issues.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell>
                    <p className="font-medium">{issue.title}</p>
                    <p className="text-muted-foreground text-xs">{issue.description}</p>
                  </TableCell>

                  <TableCell>
                    {canResolve ? (
                      <Select
                        value={issue.status}
                        onChange={(event) => updateStatus(issue.id, event.target.value)}
                        options={[
                          { label: "Pending", value: "pending" },
                          { label: "Resolved", value: "resolved" },
                        ]}
                      />
                    ) : (
                      <Badge variant={issue.status === "resolved" ? "success" : "warning"}>
                        {issue.status}
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>{formatDateTime(issue.created_at)}</TableCell>
                  <TableCell>
                    {issue.image_url ? (
                      <a href={issue.image_url} target="_blank" rel="noreferrer" className="text-primary text-sm underline">
                        View
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">N/A</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => loadHistory(issue.id)}>
                          <History className="mr-1 size-3" />
                          Timeline
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Issue Timeline</DialogTitle>
                          <DialogDescription>{issue.title}</DialogDescription>
                        </DialogHeader>

                        <div className="max-h-72 space-y-2 overflow-y-auto">
                          {isPending && !history[issue.id] ? (
                            <div className="text-muted-foreground flex items-center gap-2 text-sm">
                              <Loader2 className="size-4 animate-spin" /> Loading history...
                            </div>
                          ) : history[issue.id]?.length ? (
                            history[issue.id].map((entry) => (
                              <div key={entry.id} className="rounded-md border p-3 text-sm">
                                <p>
                                  {entry.previous_status ?? "new"} → {entry.new_status}
                                </p>
                                <p className="text-muted-foreground text-xs">{formatDateTime(entry.changed_at)}</p>
                                {entry.note && <p className="text-muted-foreground mt-1 text-xs">{entry.note}</p>}
                              </div>
                            ))
                          ) : (
                            <p className="text-muted-foreground text-sm">No timeline entries yet.</p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                  No issues reported yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
