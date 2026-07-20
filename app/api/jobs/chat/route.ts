import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { sendJobChatMessage } from "@/lib/actions/jobChat.action";

export const maxDuration = 60;

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
    const message = error?.message || "Failed to send message";
    const status = /rate limit|quota|429/i.test(message) ? 429 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
