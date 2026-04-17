"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Camera, CheckCircle2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import { getCurrentBrowserLocation } from "@/lib/geolocation";
import { type CampusClass } from "@/lib/types";
import { ATTENDANCE_PROXIMITY_RADIUS_METERS, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type QrScannerCardProps = {
  classes: CampusClass[];
  compact?: boolean;
  title?: string;
  description?: string;
};

export function QrScannerCard({
  classes,
  compact = false,
  title = "QR Attendance Scan",
  description = "Scan live class QR or paste code manually.",
}: QrScannerCardProps) {
  const [availableClasses, setAvailableClasses] = useState<CampusClass[]>(classes);
  const [qrToken, setQrToken] = useState("");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [scanEnabled, setScanEnabled] = useState(false);
  const [isPending, startTransition] = useTransition();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerElementId = useMemo(() => `qr-scanner-${Math.random().toString(36).slice(2)}`, []);
  const supabase = useMemo(() => createClient(), []);

  const selectedClass = useMemo(
    () => availableClasses.find((classItem) => classItem.id === classId) ?? null,
    [availableClasses, classId]
  );

  useEffect(() => {
    setAvailableClasses(classes);
  }, [classes]);

  useEffect(() => {
    if (classId && availableClasses.some((classItem) => classItem.id === classId)) {
      return;
    }

    setClassId(availableClasses[0]?.id ?? "");
  }, [availableClasses, classId]);

  useEffect(() => {
    const refreshClasses = async () => {
      try {
        const res = await fetch("/api/classes");
        const payload = await res.json();

        if (res.ok && Array.isArray(payload.data)) {
          setAvailableClasses(payload.data as CampusClass[]);
        }
      } catch {
        // Keep previous class list if refresh fails
      }
    };

    const channel = supabase
      .channel("attendance-classes-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "classes" }, () => {
        void refreshClasses();
      })
      .subscribe();

    void refreshClasses();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    if (!scanEnabled) {
      return;
    }

    const scanner = new Html5QrcodeScanner(
      scannerElementId,
      {
        fps: 10,
        qrbox: 220,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        setQrToken(decodedText);
        toast.success("QR code scanned");
      },
      () => {
        // Ignore frame-by-frame decode errors
      }
    );

    scannerRef.current = scanner;

    return () => {
      void scanner.clear();
      scannerRef.current = null;
    };
  }, [scanEnabled, scannerElementId]);

  const submitAttendance = () => {
    startTransition(async () => {
      try {
        const location = await getCurrentBrowserLocation();
        const res = await fetch("/api/attendance/mark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classId: classId || null,
            qrToken,
            lat: location.lat,
            lng: location.lng,
          }),
        });

        const payload = await res.json();

        if (!res.ok) {
          throw new Error(getErrorMessage(payload.error, "Unable to mark attendance"));
        }

        toast.success("Attendance marked successfully");
        setQrToken("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to mark attendance");
      }
    });
  };

  const isExpired =
    selectedClass?.qr_expires_at != null && new Date(selectedClass.qr_expires_at).getTime() < Date.now();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={compact ? "space-y-3" : "space-y-4"}>
        <div className="bg-muted/60 flex gap-2 rounded-lg border p-3 text-sm">
          <MapPin className="text-primary mt-0.5 size-4 shrink-0" />
          <p className="text-muted-foreground">
            Location permission is required. Attendance is only marked when you are within{" "}
            {ATTENDANCE_PROXIMITY_RADIUS_METERS} meters of the faculty QR location.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="class">Class</Label>
          <Select
            id="class"
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
            options={availableClasses.map((classItem) => ({
              value: classItem.id,
              label: `${classItem.name} · ${classItem.subject}`,
            }))}
          />
        </div>

        {selectedClass && (
          <div className="rounded-lg border p-3 text-sm">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="font-medium">{selectedClass.subject}</p>
              <Badge variant={isExpired ? "destructive" : "success"}>{isExpired ? "Expired" : "Live"}</Badge>
            </div>
            <p className="text-muted-foreground">Topic: {selectedClass.current_topic ?? "General attendance"}</p>
            <p className="text-muted-foreground text-xs mt-1">
              Expires: {selectedClass.qr_expires_at ? formatDateTime(selectedClass.qr_expires_at) : "Not set"}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="token">QR Token</Label>
          <Input
            id="token"
            value={qrToken}
            onChange={(event) => setQrToken(event.target.value)}
            placeholder="Paste scanned QR token"
          />
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={() => setScanEnabled((prev) => !prev)}>
          <Camera className="mr-2 size-4" />
          {scanEnabled ? "Hide Camera Scanner" : "Open Camera Scanner"}
        </Button>

        {scanEnabled && <div id={scannerElementId} className="[&_video]:rounded-lg" />}

        <Button
          type="button"
          className="w-full"
          onClick={submitAttendance}
          disabled={isPending || !qrToken}
        >
          <CheckCircle2 className="mr-2 size-4" />
          Mark Attendance
        </Button>
      </CardContent>
    </Card>
  );
}
