import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { getAttendanceStudents, markAttendanceByFaculty } from "@/services/attendance";

const schema = z.object({
  classId: z.string().min(1),
  studentId: z.string().min(1),
  status: z.enum(["present", "absent"]),
  attendanceDate: z.string().optional(),
});

function hasFacultyAccess(role: string) {
  return role === "faculty" || role === "admin";
}

export async function GET() {
  try {
    const auth = await getAuthContext();

    if (!auth.user || !auth.profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasFacultyAccess(auth.profile.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const data = await getAttendanceStudents(auth.supabase);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Unable to load students") },
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

    if (!hasFacultyAccess(auth.profile.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: getErrorMessage(parsed.error.flatten().fieldErrors, "Invalid attendance payload") },
        { status: 400 }
      );
    }

    const data = await markAttendanceByFaculty(auth.supabase, parsed.data);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Unable to save attendance status") },
      { status: 500 }
    );
  }
}
