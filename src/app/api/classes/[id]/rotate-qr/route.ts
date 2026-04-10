import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { rotateClassQrCode } from "@/services/attendance";

const schema = z.object({
  subject: z.string().min(2).max(80).optional(),
  topic: z.string().min(2).max(120).nullable().optional(),
  expiresInMinutes: z.number().int().min(5).max(180).optional(),
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

    if (!(auth.profile.role === "faculty" || auth.profile.role === "admin")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const rawBody = await request.text();
    const body = rawBody ? (JSON.parse(rawBody) as unknown) : {};
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = await rotateClassQrCode(auth.supabase, id, parsed.data);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to rotate QR" },
      { status: 500 }
    );
  }
}
