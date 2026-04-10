import { type Issue, type IssueStatus, type UserRole } from "@/lib/types";
import { isMissingTableError, toDbError } from "@/lib/supabase/errors";

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerSupabaseClient>>;

export async function getIssues(supabase: SupabaseClient, userId: string, role: UserRole) {
  let query = supabase
    .from("issues")
    .select("id, user_id, title, description, status, image_url, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (role === "student") {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error, "issues")) {
      return [];
    }

    throw toDbError(error, "Unable to fetch issues", "issues");
  }

  return (data ?? []) as Issue[];
}

export async function createIssue(
  supabase: SupabaseClient,
  payload: {
    user_id: string;
    title: string;
    description: string;
    image_url: string | null;
  }
) {
  const { data, error } = await supabase
    .from("issues")
    .insert({ ...payload, status: "pending" })
    .select("id, user_id, title, description, status, image_url, created_at, updated_at")
    .single();

  if (error) throw toDbError(error, "Unable to create issue", "issues");

  await supabase.from("issue_history").insert({
    issue_id: data.id,
    changed_by: payload.user_id,
    previous_status: null,
    new_status: "pending",
    note: "Issue created",
  });

  return data as Issue;
}

export async function updateIssueStatus(
  supabase: SupabaseClient,
  issueId: string,
  newStatus: IssueStatus,
  changedBy: string
) {
  const { data: existing, error: fetchError } = await supabase
    .from("issues")
    .select("id, status")
    .eq("id", issueId)
    .single();

  if (fetchError || !existing) {
    throw new Error("Issue not found");
  }

  const { data, error } = await supabase
    .from("issues")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", issueId)
    .select("id, user_id, title, description, status, image_url, created_at, updated_at")
    .single();

  if (error) throw toDbError(error, "Unable to update issue status", "issues");

  await supabase.from("issue_history").insert({
    issue_id: issueId,
    changed_by: changedBy,
    previous_status: existing.status,
    new_status: newStatus,
    note: "Status updated from dashboard",
  });

  return data as Issue;
}

export async function getIssueHistory(supabase: SupabaseClient, issueId: string) {
  const { data, error } = await supabase
    .from("issue_history")
    .select("id, issue_id, changed_by, previous_status, new_status, note, changed_at")
    .eq("issue_id", issueId)
    .order("changed_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error, "issue_history")) {
      return [];
    }

    throw toDbError(error, "Unable to fetch issue history", "issue_history");
  }

  return data ?? [];
}
