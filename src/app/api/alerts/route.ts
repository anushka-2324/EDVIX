import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { createAlert, getAlerts } from "@/services/alerts";

const alertSchema = z.object({
  title: z.string().min(3),
  message: z.string().min(3),
  type: z.enum(["class", "bus", "announcement"]),
});

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth.user || !auth.profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getAlerts(auth.supabase);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, "Unable to fetch alerts") }, { status: 500 });
  }
}

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
    const parsed = alertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: getErrorMessage(parsed.error.flatten().fieldErrors, "Invalid alert payload") },
        { status: 400 }
      );
    }

    const data = await createAlert(auth.supabase, parsed.data);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, "Unable to create alert") }, { status: 500 });
  }
}
