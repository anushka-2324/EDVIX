"use client";

import { useMemo, useState, useTransition } from "react";
import { CarFront, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRealtimeParking } from "@/hooks/use-realtime-parking";
import { type ParkingLot, type UserRole } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

type ParkingManagerProps = {
  initialLots: ParkingLot[];
  role: UserRole;
};

function getUtilizationVariant(utilization: number): "success" | "warning" | "destructive" {
  if (utilization >= 90) {
    return "destructive";
  }

  if (utilization >= 70) {
    return "warning";
  }

  return "success";
}

export function ParkingManager({ initialLots, role }: ParkingManagerProps) {
  const canManage = role === "admin" || role === "faculty";
  const { lots, setLots } = useRealtimeParking(initialLots);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const summary = useMemo(() => {
    const total = lots.reduce((acc, lot) => acc + lot.total_slots, 0);
    const occupied = lots.reduce((acc, lot) => acc + lot.occupied_slots, 0);
    const available = Math.max(0, total - occupied);

    return {
      total,
      occupied,
      available,
      utilizationPercent: total > 0 ? Math.round((occupied / total) * 100) : 0,
    };
  }, [lots]);

  const refreshLots = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/parking");
        const payload = await res.json();

        if (!res.ok) {
          throw new Error(payload.error ?? "Unable to refresh parking data");
        }

        setLots(payload.data as ParkingLot[]);
        toast.success("Parking data refreshed");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not refresh parking data");
      }
    });
  };

  const simulateTick = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/parking/simulate", { method: "POST" });
        const payload = await res.json();

        if (!res.ok) {
          throw new Error(payload.error ?? "Unable to simulate parking");
        }

        setLots(payload.data as ParkingLot[]);
        toast.success("Parking simulation tick completed");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not simulate parking");
      }
    });
  };

  const setDraft = (lotId: string, value: string) => {
    setDrafts((current) => ({
      ...current,
      [lotId]: value,
    }));
  };

  const saveOccupancy = (lot: ParkingLot) => {
    const rawValue = (drafts[lot.id] ?? String(lot.occupied_slots)).trim();
    const nextValue = Number(rawValue);

    if (!Number.isInteger(nextValue) || nextValue < 0 || nextValue > lot.total_slots) {
      toast.error(`Enter a value between 0 and ${lot.total_slots}`);
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/parking/${lot.id}/occupancy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ occupied_slots: nextValue }),
        });
        const payload = await res.json();

        if (!res.ok) {
          throw new Error(payload.error ?? "Unable to update occupancy");
        }

        const updated = payload.data as ParkingLot;

        setLots((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
        setDrafts((current) => {
          const next = { ...current };
          delete next[lot.id];
          return next;
        });

        toast.success(`${updated.zone} updated`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update occupancy");
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Smart Parking Availability</CardTitle>
            <CardDescription>Live slot occupancy across campus parking zones.</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={refreshLots} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
              Refresh
            </Button>

            {canManage && (
              <Button type="button" variant="outline" onClick={simulateTick} disabled={isPending}>
                <CarFront className="mr-2 size-4" />
                Simulate Tick
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-xs">Total Slots</p>
              <p className="mt-1 text-2xl font-semibold">{summary.total}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-xs">Occupied</p>
              <p className="mt-1 text-2xl font-semibold">{summary.occupied}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-xs">Available</p>
              <p className="mt-1 text-2xl font-semibold">{summary.available}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-xs">Utilization</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-2xl font-semibold">{summary.utilizationPercent}%</p>
                <Badge variant={getUtilizationVariant(summary.utilizationPercent)}>
                  {summary.utilizationPercent >= 90 ? "Full" : summary.utilizationPercent >= 70 ? "Busy" : "Open"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zone Availability</CardTitle>
          <CardDescription>
            {canManage
              ? "Faculty/Admin can update occupancy in real time."
              : "Live occupancy per parking zone."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Occupied</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Load</TableHead>
                <TableHead>Last Updated</TableHead>
                {canManage && <TableHead>Update</TableHead>}
              </TableRow>
            </TableHeader>

            <TableBody>
              {lots.length ? (
                lots.map((lot) => {
                  const utilization = lot.total_slots > 0 ? Math.round((lot.occupied_slots / lot.total_slots) * 100) : 0;
                  const available = Math.max(0, lot.total_slots - lot.occupied_slots);

                  return (
                    <TableRow key={lot.id}>
                      <TableCell className="font-medium">{lot.zone}</TableCell>
                      <TableCell>{lot.total_slots}</TableCell>
                      <TableCell>{lot.occupied_slots}</TableCell>
                      <TableCell>{available}</TableCell>
                      <TableCell>
                        <div className="flex min-w-40 items-center gap-2">
                          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                            <div
                              className={cn(
                                "h-full",
                                utilization >= 90
                                  ? "bg-red-500"
                                  : utilization >= 70
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                              )}
                              style={{ width: `${utilization}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{utilization}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDateTime(lot.updated_at)}</TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              max={lot.total_slots}
                              value={drafts[lot.id] ?? String(lot.occupied_slots)}
                              onChange={(event) => setDraft(lot.id, event.target.value)}
                              className="h-9 w-24"
                            />
                            <Button type="button" size="sm" variant="outline" onClick={() => saveOccupancy(lot)} disabled={isPending}>
                              Save
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={canManage ? 7 : 6} className="text-muted-foreground py-8 text-center">
                    No parking zones available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
