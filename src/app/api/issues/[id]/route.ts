import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { getIssueHistory } from "@/services/issues";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const auth = await getAuthContext();

    if (!auth.user || !auth.profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const history = await getIssueHistory(auth.supabase, id);
    return NextResponse.json({ history });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch issue history" },
      { status: 500 }
    );
  }
}
