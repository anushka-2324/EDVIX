import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { createIssue, getIssues } from "@/services/issues";

const issueSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(8),
  image_url: z.string().url().nullable().optional(),
});

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth.user || !auth.profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getIssues(auth.supabase, auth.user.id, auth.profile.role);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, "Unable to fetch issues") }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth.user || !auth.profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = issueSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: getErrorMessage(parsed.error.flatten().fieldErrors, "Invalid issue payload") },
        { status: 400 }
      );
    }

    const data = await createIssue(auth.supabase, {
      user_id: auth.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      image_url: parsed.data.image_url ?? null,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, "Unable to submit issue") }, { status: 500 });
  }
}
