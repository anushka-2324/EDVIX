import { type Issue, type IssueStatus, type UserRole } from "@/lib/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { isMissingTableError, isStackDepthError, toDbError } from "@/lib/supabase/errors";

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerSupabaseClient>>;

type IssueHistoryRow = {
  id: string;
  previous_status: string | null;
  new_status: string;
  note: string | null;
  changed_at: string;
};

const ISSUE_COLUMNS = "id, user_id, title, description, status, image_url, created_at, updated_at";
const ISSUE_HISTORY_COLUMNS = "id, issue_id, changed_by, previous_status, new_status, note, changed_at";

function hasStaffAccess(role: UserRole) {
  return role === "admin" || role === "faculty";
}

async function getIssuesWithServiceRole(userId: string, role: UserRole) {
  const service = createServiceSupabaseClient();

  let query = service.from("issues").select(ISSUE_COLUMNS).order("created_at", { ascending: false });
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

async function insertIssueWithClient(
  client: SupabaseClient,
  payload: {
    user_id: string;
    title: string;
    description: string;
    image_url: string | null;
  }
) {
  return client
    .from("issues")
    .insert({ ...payload, status: "pending" })
    .select(ISSUE_COLUMNS)
    .single();
}

async function appendIssueHistoryWithClient(
  client: SupabaseClient,
  payload: {
    issue_id: string;
    changed_by: string;
    previous_status: string | null;
    new_status: string;
    note: string;
  }
) {
  return client.from("issue_history").insert(payload);
}

async function updateIssueStatusWithClient(
  client: SupabaseClient,
  issueId: string,
  newStatus: IssueStatus
) {
  return client
    .from("issues")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", issueId)
    .select(ISSUE_COLUMNS)
    .single();
}

export async function getIssues(supabase: SupabaseClient, userId: string, role: UserRole) {
  let query = supabase.from("issues").select(ISSUE_COLUMNS).order("created_at", { ascending: false });

  if (role === "student") {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error, "issues")) {
      return [];
    }

    if (isStackDepthError(error)) {
      return getIssuesWithServiceRole(userId, role);
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
  const { data, error } = await insertIssueWithClient(supabase, payload);

  if (error) {
    if (isStackDepthError(error)) {
      const service = createServiceSupabaseClient();
      const { data: serviceData, error: serviceError } = await insertIssueWithClient(service, payload);

      if (serviceError || !serviceData) {
        throw toDbError(serviceError, "Unable to create issue", "issues");
      }

      await appendIssueHistoryWithClient(service, {
        issue_id: serviceData.id,
        changed_by: payload.user_id,
        previous_status: null,
        new_status: "pending",
        note: "Issue created",
      });

      return serviceData as Issue;
    }

    throw toDbError(error, "Unable to create issue", "issues");
  }

  if (!data) {
    throw new Error("Unable to create issue");
  }

  const { error: historyError } = await appendIssueHistoryWithClient(supabase, {
    issue_id: data.id,
    changed_by: payload.user_id,
    previous_status: null,
    new_status: "pending",
    note: "Issue created",
  });

  if (historyError && isStackDepthError(historyError)) {
    const service = createServiceSupabaseClient();
    await appendIssueHistoryWithClient(service, {
      issue_id: data.id,
      changed_by: payload.user_id,
      previous_status: null,
      new_status: "pending",
      note: "Issue created",
    });
  }

  return data as Issue;
}

async function updateIssueStatusWithServiceRole(issueId: string, newStatus: IssueStatus, changedBy: string) {
  const service = createServiceSupabaseClient();

  const { data: existing, error: fetchError } = await service
    .from("issues")
    .select("id, status")
    .eq("id", issueId)
    .single();

  if (fetchError || !existing) {
    throw new Error("Issue not found");
  }

  const { data, error } = await updateIssueStatusWithClient(service, issueId, newStatus);
  if (error || !data) {
    throw toDbError(error, "Unable to update issue status", "issues");
  }

  await appendIssueHistoryWithClient(service, {
    issue_id: issueId,
    changed_by: changedBy,
    previous_status: existing.status,
    new_status: newStatus,
    note: "Status updated from dashboard",
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

  if (fetchError) {
    if (isStackDepthError(fetchError)) {
      return updateIssueStatusWithServiceRole(issueId, newStatus, changedBy);
    }

    throw new Error("Issue not found");
  }

  if (!existing) {
    throw new Error("Issue not found");
  }

  const { data, error } = await updateIssueStatusWithClient(supabase, issueId, newStatus);

  if (error) {
    if (isStackDepthError(error)) {
      return updateIssueStatusWithServiceRole(issueId, newStatus, changedBy);
    }

    throw toDbError(error, "Unable to update issue status", "issues");
  }

  if (!data) {
    throw new Error("Issue not found");
  }

  const { error: historyError } = await appendIssueHistoryWithClient(supabase, {
    issue_id: issueId,
    changed_by: changedBy,
    previous_status: existing.status,
    new_status: newStatus,
    note: "Status updated from dashboard",
  });

  if (historyError && isStackDepthError(historyError)) {
    const service = createServiceSupabaseClient();
    await appendIssueHistoryWithClient(service, {
      issue_id: issueId,
      changed_by: changedBy,
      previous_status: existing.status,
      new_status: newStatus,
      note: "Status updated from dashboard",
    });
  }

  return data as Issue;
}

async function getIssueHistoryWithServiceRole(issueId: string, userId: string, role: UserRole) {
  const service = createServiceSupabaseClient();

  if (!hasStaffAccess(role)) {
    const { data: issue, error: issueError } = await service
      .from("issues")
      .select("id, user_id")
      .eq("id", issueId)
      .maybeSingle();

    if (issueError) {
      if (isMissingTableError(issueError, "issues")) {
        return [];
      }

      throw toDbError(issueError, "Unable to fetch issue history", "issues");
    }

    if (!issue || issue.user_id !== userId) {
      return [];
    }
  }

  const { data, error } = await service
    .from("issue_history")
    .select(ISSUE_HISTORY_COLUMNS)
    .eq("issue_id", issueId)
    .order("changed_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error, "issue_history")) {
      return [];
    }

    throw toDbError(error, "Unable to fetch issue history", "issue_history");
  }

  return (data ?? []) as IssueHistoryRow[];
}

export async function getIssueHistory(
  supabase: SupabaseClient,
  issueId: string,
  userId: string,
  role: UserRole
) {
  const { data, error } = await supabase
    .from("issue_history")
    .select(ISSUE_HISTORY_COLUMNS)
    .eq("issue_id", issueId)
    .order("changed_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error, "issue_history")) {
      return [];
    }

    if (isStackDepthError(error)) {
      return getIssueHistoryWithServiceRole(issueId, userId, role);
    }

    throw toDbError(error, "Unable to fetch issue history", "issue_history");
  }

  return (data ?? []) as IssueHistoryRow[];
}
