import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { markAttendance } from "@/services/attendance";

const attendanceSchema = z.object({
  classId: z.string().min(1).nullable().optional(),
  qrToken: z.string().min(4),
});

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();

    if (!context.user || !context.profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = attendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = await markAttendance(
      context.supabase,
      context.user.id,
      parsed.data.classId ?? null,
      parsed.data.qrToken
    );

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark attendance" },
      { status: 500 }
    );
  }
}
