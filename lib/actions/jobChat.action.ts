"use server";

import ResumeSession from "@/database/resumeSession.model";
import ResumeChunk from "@/database/resumeChunk.model";
import JobChatMessage from "@/database/jobChatMessage.model";
import { connectToDatabase } from "@/lib/mongoose";
import { getUserById } from "@/lib/actions/user.action";
import {
  chunkText,
  embedChunks,
  getGeminiEmbedding,
  retrieveContextChunks,
  chatWithGemini,
  isJobSearchIntent,
} from "@/lib/ai/jobs-rag";
import { searchJobsOnWeb } from "@/lib/ai/web-search";
import {
  CreateResumeSessionParams,
  GetActiveResumeSessionParams,
  GetSessionMessagesParams,
  ResetActiveSessionParams,
  SendJobChatMessageParams,
} from "./shared.types";

const MIN_RESUME_LENGTH = 200;

const getUserOrThrow = async (clerkId: string) => {
  const user = await getUserById({ userId: clerkId });
  if (!user) throw new Error("User not found in database");
  return user;
};

const deleteSessionData = async (sessionId: string) => {
  await JobChatMessage.deleteMany({ sessionId });
  await ResumeChunk.deleteMany({ sessionId });
  await ResumeSession.findByIdAndDelete(sessionId);
};

export async function getActiveResumeSession({
  clerkId,
}: GetActiveResumeSessionParams) {
  await connectToDatabase();
  const user = await getUserOrThrow(clerkId);

  const session = await ResumeSession.findOne({
    userId: user._id,
    status: "active",
  }).select("_id resumeText status createdAt updatedAt");

  return session;
}

export async function createOrReplaceActiveResumeSession({
  clerkId,
  resumeText,
}: CreateResumeSessionParams) {
  await connectToDatabase();
  const user = await getUserOrThrow(clerkId);

  if (!resumeText || resumeText.trim().length < MIN_RESUME_LENGTH) {
    throw new Error("Resume must be at least 200 characters");
  }

  const existing = await ResumeSession.findOne({
    userId: user._id,
    status: "active",
  });

  if (existing) {
    await deleteSessionData(String(existing._id));
  }

  const session = await ResumeSession.create({
    userId: user._id,
    clerkId,
    resumeText: resumeText.trim(),
    status: "active",
  });

  try {
    const chunks = chunkText(resumeText);
    const embeddings = await embedChunks(chunks);

    const chunkDocs = chunks.map((text, index) => ({
      sessionId: session._id,
      userId: user._id,
      chunkIndex: index,
      text,
      embedding: embeddings[index],
    }));

    if (chunkDocs.length > 0) {
      await ResumeChunk.insertMany(chunkDocs);
    }

    return {
      sessionId: String(session._id),
      chunkCount: chunkDocs.length,
    };
  } catch (error) {
    await deleteSessionData(String(session._id));
    throw error;
  }
}

export async function getSessionMessages({
  clerkId,
  cursor,
  limit = 20,
}: GetSessionMessagesParams) {
  await connectToDatabase();
  const user = await getUserOrThrow(clerkId);

  const session = await ResumeSession.findOne({
    userId: user._id,
    status: "active",
  });

  if (!session) {
    return { messages: [], nextCursor: null, hasMore: false };
  }

  const query: any = { sessionId: session._id };

  if (cursor) {
    const cursorMessage = await JobChatMessage.findById(cursor);
    if (cursorMessage) {
      query.createdAt = { $lt: cursorMessage.createdAt };
    }
  }

  const rows = await JobChatMessage.find(query)
    .sort({ createdAt: -1 })
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const messages = pageRows
    .map((m) => ({
      id: String(m._id),
      role: m.role,
      content: m.content,
      meta: m.meta || null,
      createdAt: m.createdAt,
    }))
    .reverse();

  const nextCursor = hasMore ? String(pageRows[pageRows.length - 1]._id) : null;

  return { messages, nextCursor, hasMore };
}

export async function sendJobChatMessage({
  clerkId,
  message,
}: SendJobChatMessageParams) {
  await connectToDatabase();
  const user = await getUserOrThrow(clerkId);

  const session = await ResumeSession.findOne({
    userId: user._id,
    status: "active",
  });

  if (!session) throw new Error("No active resume session");

  const trimmed = message.trim();
  if (!trimmed) throw new Error("Message cannot be empty");

  await JobChatMessage.create({
    sessionId: session._id,
    userId: user._id,
    role: "user",
    content: trimmed,
  });

  const recentMessages = await JobChatMessage.find({ sessionId: session._id })
    .sort({ createdAt: -1 })
    .limit(8);

  const chatHistory = recentMessages
    .reverse()
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const queryEmbedding = await getGeminiEmbedding(trimmed);
  const matchedChunks = await retrieveContextChunks({
    sessionId: String(session._id),
    userId: String(user._id),
    queryEmbedding,
    limit: 6,
  });

  let webResults: { title: string; url: string; snippet: string }[] = [];
  if (isJobSearchIntent(trimmed)) {
    try {
      webResults = await searchJobsOnWeb(trimmed, 10);
    } catch (error) {
      console.error("Tavily search failed:", error);
    }
  }

  const assistantText = await chatWithGemini({
    systemPrompt:
      "You are QueueOverFlow Jobs AI Coach. Help users improve resumes and find jobs. Be specific, actionable, and format every reply in polished Markdown.",
    contextChunks: matchedChunks.map((c) => c.text),
    chatHistory,
    userPrompt: trimmed,
    webResults,
  });

  const savedAssistant = await JobChatMessage.create({
    sessionId: session._id,
    userId: user._id,
    role: "assistant",
    content: assistantText,
    meta: webResults.length ? { jobs: webResults } : undefined,
  });

  return {
    message: {
      id: String(savedAssistant._id),
      role: "assistant",
      content: savedAssistant.content,
      meta: savedAssistant.meta || null,
      createdAt: savedAssistant.createdAt,
    },
  };
}

export async function resetActiveSession({
  clerkId,
}: ResetActiveSessionParams) {
  await connectToDatabase();
  const user = await getUserOrThrow(clerkId);

  const session = await ResumeSession.findOne({
    userId: user._id,
    status: "active",
  });

  if (!session) return { ok: true };

  await deleteSessionData(String(session._id));
  return { ok: true };
}
