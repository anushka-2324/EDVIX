import { IssueForm } from "@/components/issues/issue-form";
import { IssuesTable } from "@/components/issues/issues-table";
import { requireUser } from "@/lib/auth";
import { getIssues } from "@/services/issues";

export default async function IssuesPage() {
  const { supabase, profile, user } = await requireUser();
  const issues = await getIssues(supabase, user.id, profile.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Issue Reporting Desk</h1>
        <p className="text-muted-foreground text-sm">
          Submit campus concerns with evidence and track resolution status.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <IssueForm />
        <IssuesTable role={profile.role} issues={issues} />
      </div>
    </div>
  );
}
