"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { MapPin, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getCurrentBrowserLocation } from "@/lib/geolocation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/errors";
import { ATTENDANCE_PROXIMITY_RADIUS_METERS, formatDateTime } from "@/lib/utils";

type QrGeneratorCardProps = {
  classId: string;
  className: string;
  initialToken: string;
  initialSubject: string;
  initialTopic: string | null;
  initialExpiry: string | null;
};

export function QrGeneratorCard({
  classId,
  className,
  initialToken,
  initialSubject,
  initialTopic,
  initialExpiry,
}: QrGeneratorCardProps) {
  const [token, setToken] = useState(initialToken);
  const [subject, setSubject] = useState(initialSubject);
  const [topic, setTopic] = useState(initialTopic ?? "");
  const [expiresInMinutes, setExpiresInMinutes] = useState("45");
  const [expiresAt, setExpiresAt] = useState(initialExpiry);
  const [qrImage, setQrImage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const buildQr = useCallback(async (nextToken: string) => {
    const dataUrl = await QRCode.toDataURL(nextToken, {
      width: 220,
      margin: 1,
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    });

    setQrImage(dataUrl);
  }, []);

  useEffect(() => {
    void buildQr(token);
  }, [buildQr, token]);

  const rotateQr = () => {
    const parsedMinutes = Number(expiresInMinutes);

    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    if (!Number.isInteger(parsedMinutes) || parsedMinutes < 5 || parsedMinutes > 180) {
      toast.error("Expiry must be between 5 and 180 minutes");
      return;
    }

    startTransition(async () => {
      try {
        const location = await getCurrentBrowserLocation();
        const res = await fetch(`/api/classes/${classId}/rotate-qr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: subject.trim(),
            topic: topic.trim() ? topic.trim() : null,
            expiresInMinutes: parsedMinutes,
            lat: location.lat,
            lng: location.lng,
          }),
        });

        const payload = await res.json();

        if (!res.ok) {
          throw new Error(getErrorMessage(payload.error, "Failed to refresh QR"));
        }

        const nextToken = payload.data.qr_code as string;
        setToken(nextToken);
        setSubject((payload.data.subject as string) ?? subject);
        setTopic((payload.data.current_topic as string | null) ?? "");
        setExpiresAt((payload.data.qr_expires_at as string | null) ?? null);
        toast.success(`Live QR updated for ${className}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{className}</CardTitle>
        <CardDescription>Customize attendance QR by subject and lecture topic.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/60 flex gap-2 rounded-lg border p-3 text-sm">
          <MapPin className="text-primary mt-0.5 size-4 shrink-0" />
          <p className="text-muted-foreground">
            Refreshing the QR anchors attendance to your current classroom position. Students outside{" "}
            {ATTENDANCE_PROXIMITY_RADIUS_METERS} meters will be blocked.
          </p>
        </div>

        <div className="grid gap-3">
          <div className="space-y-1">
            <Label htmlFor={`subject-${classId}`}>Subject</Label>
            <Input
              id={`subject-${classId}`}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Data Structures"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`topic-${classId}`}>Topic (optional)</Label>
            <Input
              id={`topic-${classId}`}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Trees and traversals"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`expiry-${classId}`}>QR Expiry</Label>
            <Select
              id={`expiry-${classId}`}
              value={expiresInMinutes}
              onChange={(event) => setExpiresInMinutes(event.target.value)}
              options={[
                { value: "15", label: "15 minutes" },
                { value: "30", label: "30 minutes" },
                { value: "45", label: "45 minutes" },
                { value: "60", label: "60 minutes" },
                { value: "90", label: "90 minutes" },
              ]}
            />
          </div>
        </div>

        {qrImage ? (
          <Image
            src={qrImage}
            alt={`${className} QR`}
            width={220}
            height={220}
            unoptimized
            className="mx-auto rounded-lg border bg-white p-2"
          />
        ) : (
          <div className="bg-muted mx-auto h-[220px] w-[220px] animate-pulse rounded-lg" />
        )}

        <div className="space-y-2 rounded-lg border p-3">
          <p className="font-medium">Current Session</p>
          <p className="text-sm">
            {subject}
            {topic ? ` · ${topic}` : ""}
          </p>
          <p className="bg-muted rounded-lg p-2 font-mono text-xs break-all">Token: {token}</p>
          <p className="text-muted-foreground text-xs">
            Expires: {expiresAt ? formatDateTime(expiresAt) : "Not set"}
          </p>
        </div>

        <Button type="button" onClick={rotateQr} disabled={isPending} className="w-full">
          <RefreshCw className={`mr-2 size-4 ${isPending ? "animate-spin" : ""}`} />
          Start / Refresh Live QR
        </Button>
      </CardContent>
    </Card>
  );
}
