import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { getParkingLots, getParkingSummary } from "@/services/parking";

export async function GET() {
  try {
    const auth = await getAuthContext();

    if (!auth.user || !auth.profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getParkingLots(auth.supabase);
    const summary = getParkingSummary(data);

    return NextResponse.json({ data, summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch parking data" },
      { status: 500 }
    );
  }
}
