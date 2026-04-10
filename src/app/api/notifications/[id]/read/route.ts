import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { markNotificationRead } from "@/services/alerts";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    const auth = await getAuthContext();

    if (!auth.user || !auth.profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await markNotificationRead(auth.supabase, id, auth.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update notification" },
      { status: 500 }
    );
  }
}
