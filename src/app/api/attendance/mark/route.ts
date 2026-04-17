import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { markAttendance } from "@/services/attendance";

const attendanceSchema = z.object({
  classId: z.string().min(1).nullable().optional(),
  qrToken: z.string().min(4),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();

    if (!context.user || !context.profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (context.profile.role !== "student") {
      return NextResponse.json({ error: "Only students can mark attendance" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = attendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: getErrorMessage(parsed.error.flatten().fieldErrors, "Invalid attendance payload") },
        { status: 400 }
      );
    }

    const data = await markAttendance(
      context.supabase,
      context.user.id,
      parsed.data.classId ?? null,
      parsed.data.qrToken,
      parsed.data.lat,
      parsed.data.lng
    );

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, "Failed to mark attendance") }, { status: 500 });
  }
}
