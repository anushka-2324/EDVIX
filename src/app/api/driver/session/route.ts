import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { getBuses, getDriverAssignedBus, upsertDriverBusSession } from "@/services/buses";

const schema = z.object({
  bus_id: z.string().uuid(),
  bus_number: z.enum(["PS01", "PS02", "PS03", "PS04"]),
  pickup_area: z.string().min(2).max(120),
  pickup_source: z.enum(["college", "school"]),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export async function GET() {
  try {
    const auth = await getAuthContext();

    if (!auth.user || !auth.profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.profile.role !== "bus_driver") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const [assigned, buses] = await Promise.all([
      getDriverAssignedBus(auth.supabase, auth.user.id),
      getBuses(auth.supabase),
    ]);

    return NextResponse.json({ data: { assigned, buses } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch driver session" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();

    if (!auth.user || !auth.profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.profile.role !== "bus_driver") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = await upsertDriverBusSession(auth.supabase, {
      driverId: auth.user.id,
      busId: parsed.data.bus_id,
      busNumber: parsed.data.bus_number,
      pickupArea: parsed.data.pickup_area,
      pickupSource: parsed.data.pickup_source,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update driver session" },
      { status: 500 }
    );
  }
}
