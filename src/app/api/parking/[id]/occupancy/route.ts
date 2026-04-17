import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { updateParkingOccupancy } from "@/services/parking";

const schema = z.object({
  occupied_slots: z.number().int().nonnegative(),
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
        { error: getErrorMessage(parsed.error.flatten().fieldErrors, "Invalid parking payload") },
        { status: 400 }
      );
    }

    const data = await updateParkingOccupancy(auth.supabase, id, parsed.data.occupied_slots);

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Unable to update parking occupancy") },
      { status: 500 }
    );
  }
}
