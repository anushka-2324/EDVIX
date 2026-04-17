import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { getUserTransportPreference, updateUserTransportPreference } from "@/services/buses";

const schema = z.object({
  preferred_bus_id: z.string().uuid().nullable().optional(),
  preferred_area: z.string().min(2).max(80).nullable().optional(),
  preferred_source: z.enum(["college", "school"]).nullable().optional(),
});

export async function GET() {
  try {
    const auth = await getAuthContext();

    if (!auth.user || !auth.profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getUserTransportPreference(auth.supabase, auth.user.id);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Unable to fetch transport preferences") },
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

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: getErrorMessage(parsed.error.flatten().fieldErrors, "Invalid transport preference payload") },
        { status: 400 }
      );
    }

    const data = await updateUserTransportPreference(auth.supabase, auth.user.id, {
      preferred_bus_id: parsed.data.preferred_bus_id ?? null,
      preferred_area: parsed.data.preferred_area ?? null,
      preferred_source: parsed.data.preferred_source ?? null,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Unable to update transport preferences") },
      { status: 500 }
    );
  }
}
