import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { reserveParkingSlots } from "@/services/parking";

const schema = z.object({
  vehicleType: z.enum(["car", "twoWheeler"]),
  slots: z.number().int().positive().max(10).default(1),
});

export async function POST(request: Request) {
  try {
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
        { error: getErrorMessage(parsed.error.flatten().fieldErrors, "Invalid parking reservation payload") },
        { status: 400 }
      );
    }

    const data = await reserveParkingSlots(auth.supabase, parsed.data.vehicleType, parsed.data.slots);

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Unable to reserve parking") },
      { status: 500 }
    );
  }
}
