import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { simulateBusMovement } from "@/services/buses";

export async function POST() {
  try {
    const auth = await getAuthContext();

    if (!auth.user || !auth.profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(auth.profile.role === "admin" || auth.profile.role === "faculty")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const data = await simulateBusMovement(auth.supabase);

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not simulate buses" },
      { status: 500 }
    );
  }
}
