import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { getSessionMessages } from "@/lib/actions/jobChat.action";

export async function GET(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Number(searchParams.get("limit") || 20);

    const data = await getSessionMessages({
      clerkId: userId,
      cursor,
      limit,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
