import { NextResponse } from "next/server";
import { generateChatCompletion } from "@/lib/ai/gemini";

export const POST = async (request: Request) => {
  try {
    const { question } = await request.json();

    if (!question?.trim()) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const prompt = `You are a knowledgeable programming assistant.
Answer this question clearly with examples when useful:

${question}`;

    const reply = await generateChatCompletion(prompt);
    return NextResponse.json({ reply });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
