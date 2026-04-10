import { type Alert, type AlertType } from "@/lib/types";
import { isMissingTableError, toDbError } from "@/lib/supabase/errors";

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerSupabaseClient>>;

export async function getAlerts(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("alerts")
    .select("id, title, message, type, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    if (isMissingTableError(error, "alerts")) {
      return [];
    }

    throw toDbError(error, "Unable to fetch alerts", "alerts");
  }

  return (data ?? []) as Alert[];
}

export async function createAlert(
  supabase: SupabaseClient,
  payload: { title: string; message: string; type: AlertType }
) {
  const { data, error } = await supabase
    .from("alerts")
    .insert(payload)
    .select("id, title, message, type, created_at")
    .single();

  if (error) throw toDbError(error, "Unable to create alert", "alerts");

  const { data: users } = await supabase.from("users").select("id");
  if (users?.length) {
    await supabase.from("notifications").insert(
      users.map((user) => ({
        user_id: user.id,
        content: `${payload.title}: ${payload.message}`,
      }))
    );
  }

  return data as Alert;
}

export async function getNotifications(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_id, content, read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    if (isMissingTableError(error, "notifications")) {
      return [];
    }

    throw toDbError(error, "Unable to fetch notifications", "notifications");
  }

  return data ?? [];
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  notificationId: string,
  userId: string
) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) throw toDbError(error, "Unable to update notification", "notifications");
}
