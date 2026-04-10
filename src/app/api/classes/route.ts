import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { createClassSession, getClasses } from "@/services/attendance";

const schema = z.object({
  name: z.string().min(2).max(120),
  subject: z.string().min(2).max(80).optional(),
  topic: z.string().min(2).max(120).nullable().optional(),
  expiresInMinutes: z.number().int().min(5).max(180).optional(),
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch classes" },
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

    if (!(auth.profile.role === "faculty" || auth.profile.role === "admin")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = await createClassSession(auth.supabase, parsed.data);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create class session" },
      { status: 500 }
    );
  }
}
