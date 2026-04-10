"use client";

import { useMemo, useState, useTransition } from "react";
import { BellRing, Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRealtimeAlerts } from "@/hooks/use-realtime-alerts";
import { type Alert, type AlertType, type Notification, type UserRole } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type AlertsFeedProps = {
  role: UserRole;
  initialAlerts: Alert[];
  initialNotifications: Notification[];
};

const alertColor: Record<AlertType, "secondary" | "warning" | "default"> = {
  class: "secondary",
  bus: "warning",
  announcement: "default",
};

export function AlertsFeed({ role, initialAlerts, initialNotifications }: AlertsFeedProps) {
  const { alerts, setAlerts } = useRealtimeAlerts(initialAlerts);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<AlertType>("announcement");

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const sendAlert = () => {
    startTransition(async () => {
      try {
        const optimisticAlert: Alert = {
          id: crypto.randomUUID(),
          title,
          message,
          type,
          created_at: new Date().toISOString(),
        };

        setAlerts((current) => [optimisticAlert, ...current]);

        const res = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, message, type }),
        });

        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload.error ?? "Failed to broadcast alert");
        }

        setTitle("");
        setMessage("");
        setType("announcement");
        toast.success("Alert sent to campus feed");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to send alert");
      }
    });
  };

  const markRead = (id: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );

    void fetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => undefined);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        {(role === "admin" || role === "faculty") && (
          <Card>
            <CardHeader>
              <CardTitle>Create Smart Alert</CardTitle>
              <CardDescription>Push realtime class, bus, or announcement notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="alert-title">Title</Label>
                <Input
                  id="alert-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="CS301 Lab shifted to C4"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alert-type">Type</Label>
                <Select
                  id="alert-type"
                  value={type}
                  onChange={(event) => setType(event.target.value as AlertType)}
                  options={[
                    { label: "Announcement", value: "announcement" },
                    { label: "Class", value: "class" },
                    { label: "Bus", value: "bus" },
                  ]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alert-message">Message</Label>
                <Textarea
                  id="alert-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Please report by 9:30 AM"
                />
              </div>

              <Button
                type="button"
                onClick={sendAlert}
                disabled={isPending || !title.trim() || !message.trim()}
              >
                <Send className="mr-2 size-4" />
                Broadcast Alert
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Realtime Alerts Feed</CardTitle>
            <CardDescription>Campus-wide updates streaming via Supabase Realtime.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length ? (
              alerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-medium">{alert.title}</p>
                    <Badge variant={alertColor[alert.type]}>{alert.type}</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">{alert.message}</p>
                  <p className="text-muted-foreground mt-2 text-xs">{formatDateTime(alert.created_at)}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No alerts yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="size-4" />
            My Notifications
          </CardTitle>
          <CardDescription>
            <span className="font-medium">{unreadCount}</span> unread notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.length ? (
            notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => markRead(notification.id)}
                className="hover:bg-muted w-full rounded-lg border p-3 text-left"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Megaphone className="text-primary size-4" />
                  <Badge variant={notification.read ? "outline" : "secondary"}>
                    {notification.read ? "Read" : "Unread"}
                  </Badge>
                </div>
                <p className="text-sm">{notification.content}</p>
                <p className="text-muted-foreground mt-2 text-xs">{formatDateTime(notification.created_at)}</p>
              </button>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">No notifications yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
