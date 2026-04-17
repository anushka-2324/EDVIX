"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { getCurrentBrowserLocation } from "@/lib/geolocation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/errors";
import { ATTENDANCE_PROXIMITY_RADIUS_METERS } from "@/lib/utils";

export function CreateClassSessionCard() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [expiresInMinutes, setExpiresInMinutes] = useState("45");
  const [isPending, startTransition] = useTransition();

  const createSession = () => {
    const parsedMinutes = Number(expiresInMinutes);

    if (!name.trim()) {
      toast.error("Class name is required");
      return;
    }

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
        const res = await fetch("/api/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            subject: subject.trim(),
            topic: topic.trim() ? topic.trim() : null,
            expiresInMinutes: parsedMinutes,
            lat: location.lat,
            lng: location.lng,
          }),
        });

        const payload = await res.json();

        if (!res.ok) {
          throw new Error(getErrorMessage(payload.error, "Unable to create class session"));
        }

        toast.success("Class session created. Customize QR below.");
        setName("");
        setTopic("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create class session");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Attendance Session</CardTitle>
        <CardDescription>Create your class first, then customize and rotate live QR instantly.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-muted/60 flex gap-2 rounded-lg border p-3 text-sm">
          <MapPin className="text-primary mt-0.5 size-4 shrink-0" />
          <p className="text-muted-foreground">
            Your current location is captured when the session is created. Students must be within{" "}
            {ATTENDANCE_PROXIMITY_RADIUS_METERS} meters of that QR origin to mark attendance.
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="class-name">Class Name</Label>
          <Input
            id="class-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="CS301 - Data Structures"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="class-subject">Subject</Label>
          <Input
            id="class-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Data Structures"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="class-topic">Topic (optional)</Label>
          <Input
            id="class-topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Trees and traversals"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="class-expiry">Initial QR Expiry</Label>
          <Select
            id="class-expiry"
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

        <Button type="button" className="w-full" onClick={createSession} disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <PlusCircle className="mr-2 size-4" />}
          Create Class Session
        </Button>
      </CardContent>
    </Card>
  );
}
