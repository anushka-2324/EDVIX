import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { createClassSession, getClasses } from "@/services/attendance";

const schema = z.object({
  name: z.string().min(2).max(120),
  subject: z.string().min(2).max(80).optional(),
  topic: z.string().min(2).max(120).nullable().optional(),
  expiresInMinutes: z.number().int().min(5).max(180).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function GET() {
  try {
    const auth = await getAuthContext();

    if (!auth.user || !auth.profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getClasses(auth.supabase);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, "Unable to fetch classes") }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();

    if (!auth.user || !auth.profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(auth.profile.role === "faculty" || auth.profile.role === "admin")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: getErrorMessage(parsed.error.flatten().fieldErrors, "Invalid class payload") },
        { status: 400 }
      );
    }

    const data = await createClassSession(auth.supabase, {
      ...parsed.data,
      latitude: parsed.data.lat,
      longitude: parsed.data.lng,
      generatedByUserId: auth.user.id,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Unable to create class session") },
      { status: 500 }
    );
  }
}
