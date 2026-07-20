import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import {
  createOrReplaceActiveResumeSession,
  getActiveResumeSession,
  resetActiveSession,
} from "@/lib/actions/jobChat.action";

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const session = await getActiveResumeSession({ clerkId: userId });
    return NextResponse.json({ ok: true, data: { session } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const resumeText = body?.resumeText;

    const data = await createOrReplaceActiveResumeSession({
      clerkId: userId,
      resumeText,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const data = await resetActiveSession({ clerkId: userId });
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}