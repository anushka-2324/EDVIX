import { subDays } from "date-fns";
import { type ParkingAvailabilitySummary, type UserRole } from "@/lib/types";
import { isMissingTableError, toDbError } from "@/lib/supabase/errors";

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerSupabaseClient>>;

export async function getDashboardSummary(supabase: SupabaseClient, userId: string, role: UserRole) {
  const since = subDays(new Date(), 7).toISOString();

  const [attendanceRes, issuesRes, notificationsRes, usersRes, parking] = await Promise.all([
    role === "student"
      ? supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("timestamp", since)
      : supabase.from("attendance").select("id", { count: "exact", head: true }).gte("timestamp", since),
    role === "student"
      ? supabase.from("issues").select("id", { count: "exact", head: true }).eq("user_id", userId)
      : supabase.from("issues").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false),
    supabase.from("users").select("id", { count: "exact", head: true }),
    getParkingAvailabilitySummary(supabase),
  ]);

  const resolveCount = (
    result: { count: number | null; error: unknown },
    table: string,
    fallbackMessage: string
  ) => {
    if (!result.error) {
      return result.count ?? 0;
    }

    if (isMissingTableError(result.error, table)) {
      return 0;
    }

    throw toDbError(result.error, fallbackMessage, table);
  };

  const attendanceCount = resolveCount(attendanceRes, "attendance", "Unable to load attendance summary");
  const issuesCount = resolveCount(issuesRes, "issues", "Unable to load issues summary");
  const unreadNotifications = resolveCount(
    notificationsRes,
    "notifications",
    "Unable to load notification summary"
  );
  const activeUsers = resolveCount(usersRes, "users", "Unable to load users summary");

  return {
    attendanceCount,
    issuesCount,
    unreadNotifications,
    activeUsers,
    parking,
  };
}

export async function getParkingAvailabilitySummary(
  supabase: SupabaseClient
): Promise<ParkingAvailabilitySummary> {
  const { data, error } = await supabase
    .from("parking_availability")
    .select("total_slots, occupied_slots");

  if (error) {
    if (isMissingTableError(error, "parking_availability")) {
      return {
        total: 0,
        occupied: 0,
        available: 0,
        utilizationPercent: 0,
      };
    }

    throw toDbError(error, "Unable to load parking availability", "parking_availability");
  }

  const { total, occupied } = (data ?? []).reduce(
    (acc, row) => {
      acc.total += row.total_slots ?? 0;
      acc.occupied += row.occupied_slots ?? 0;
      return acc;
    },
    { total: 0, occupied: 0 }
  );

  const available = Math.max(0, total - occupied);

  return {
    total,
    occupied,
    available,
    utilizationPercent: total > 0 ? Math.round((occupied / total) * 100) : 0,
  };
}

export async function getAttendanceByClass(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("attendance")
    .select("class_id, classes(name)")
    .order("timestamp", { ascending: false })
    .limit(500);

  if (error) {
    if (isMissingTableError(error, "attendance") || isMissingTableError(error, "classes")) {
      return [];
    }

    throw toDbError(error, "Unable to load attendance analytics");
  }

  const counts = new Map<string, number>();

  for (const entry of data ?? []) {
    const classData = Array.isArray(entry.classes) ? entry.classes[0] : entry.classes;
    const className = classData?.name ?? "Unknown";
    counts.set(className, (counts.get(className) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
}

export async function getIssueStatusBreakdown(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("issues").select("status");
  if (error) {
    if (isMissingTableError(error, "issues")) {
      return [
        { name: "Pending", value: 0 },
        { name: "Resolved", value: 0 },
      ];
    }

    throw toDbError(error, "Unable to load issue analytics", "issues");
  }

  const pending = (data ?? []).filter((issue) => issue.status === "pending").length;
  const resolved = (data ?? []).filter((issue) => issue.status === "resolved").length;

  return [
    { name: "Pending", value: pending },
    { name: "Resolved", value: resolved },
  ];
}
