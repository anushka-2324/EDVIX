import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { updateIssueStatus } from "@/services/issues";

const schema = z.object({
  status: z.enum(["pending", "resolved"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const auth = await getAuthContext();

    if (!auth.user || !auth.profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(auth.profile.role === "admin" || auth.profile.role === "faculty")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: getErrorMessage(parsed.error.flatten().fieldErrors, "Invalid issue status payload") },
        { status: 400 }
      );
    }

    const data = await updateIssueStatus(auth.supabase, id, parsed.data.status, auth.user.id);

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, "Unable to update status") }, { status: 500 });
  }
}
