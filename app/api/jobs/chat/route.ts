import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { sendJobChatMessage } from "@/lib/actions/jobChat.action";

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const message = body?.message;

    const data = await sendJobChatMessage({ clerkId: userId, message });
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 }
    );
  }
}
