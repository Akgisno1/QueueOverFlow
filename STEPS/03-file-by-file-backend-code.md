# 03) File-By-File Backend Code (Complete)

Follow this file **in order**. Each section says:
- **which file to open/create**
- **what to remove/add**
- **full code to paste**

---

## Step 3.1 — Protect `/jobs` route with Clerk

### File: `middleware.ts`

### Current issue
`/jobs` is currently public:

```ts
publicRoutes: [
  // ...
  "/jobs",
],
```

### What to do
1. Open `middleware.ts`.
2. Remove `"/jobs"` from `publicRoutes`.
3. Keep jobs API routes protected (do NOT add them to `ignoredRoutes`).

### Final `middleware.ts` should look like:

```ts
import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: [
    "/",
    "/api/webhook",
    "/question/:id",
    "/tags",
    "/tags/:id",
    "/profile/:id",
    "/community",
  ],
  ignoredRoutes: ["/api/webhook", "/api/chatgpt"],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

### How to verify
1. Run `npm run dev`.
2. Sign out.
3. Visit `http://localhost:3000/jobs`.
4. You should be redirected to Clerk sign-in.

---

## Step 3.2 — Add TypeScript types for job chat actions

### File: `lib/actions/shared.types.d.ts`

### What to do
Scroll to bottom of file and append:

```ts
export interface CreateResumeSessionParams {
  clerkId: string;
  resumeText: string;
}

export interface GetActiveResumeSessionParams {
  clerkId: string;
}

export interface SendJobChatMessageParams {
  clerkId: string;
  message: string;
}

export interface GetSessionMessagesParams {
  clerkId: string;
  cursor?: string;
  limit?: number;
}

export interface ResetActiveSessionParams {
  clerkId: string;
}
```

---

## Step 3.3 — Create Mongo models

Create these 3 files in `database/` folder.

---

### File: `database/resumeSession.model.ts`

Create this new file with full content:

```ts
import { Document, Schema, model, models } from "mongoose";

export interface IResumeSession extends Document {
  userId: Schema.Types.ObjectId;
  clerkId: string;
  resumeText: string;
  status: "active" | "closed";
  createdAt: Date;
  updatedAt: Date;
}

const ResumeSessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clerkId: { type: String, required: true, index: true },
    resumeText: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

ResumeSessionSchema.index({ userId: 1, status: 1 });

const ResumeSession =
  models.ResumeSession || model<IResumeSession>("ResumeSession", ResumeSessionSchema);

export default ResumeSession;
```

---

### File: `database/resumeChunk.model.ts`

```ts
import { Document, Schema, model, models } from "mongoose";

export interface IResumeChunk extends Document {
  sessionId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  chunkIndex: number;
  text: string;
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

const ResumeChunkSchema = new Schema(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "ResumeSession",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
  },
  { timestamps: true }
);

ResumeChunkSchema.index({ sessionId: 1, chunkIndex: 1 });

const ResumeChunk =
  models.ResumeChunk || model<IResumeChunk>("ResumeChunk", ResumeChunkSchema);

export default ResumeChunk;
```

---

### File: `database/jobChatMessage.model.ts`

```ts
import { Document, Schema, model, models } from "mongoose";

export interface IJobChatMessage extends Document {
  sessionId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  role: "user" | "assistant" | "system";
  content: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const JobChatMessageSchema = new Schema(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "ResumeSession",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

JobChatMessageSchema.index({ sessionId: 1, createdAt: -1 });

const JobChatMessage =
  models.JobChatMessage || model<IJobChatMessage>("JobChatMessage", JobChatMessageSchema);

export default JobChatMessage;
```

---

## Step 3.4 — Create Gemini + chunking helper

### File: `lib/ai/jobs-rag.ts` (new)

Create folder `lib/ai/` if missing, then create this file:

```ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Types } from "mongoose";
import ResumeChunk from "@/database/resumeChunk.model";

const CHUNK_SIZE = 700;
const CHUNK_OVERLAP = 120;
const CHAT_MODEL = "gemini-1.5-flash";
const EMBEDDING_MODEL = "text-embedding-004";

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  return new GoogleGenerativeAI(apiKey);
};

export const chunkText = (text: string): string[] => {
  const cleaned = text.trim();
  if (!cleaned) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    const piece = cleaned.slice(start, end).trim();
    if (piece.length > 30) chunks.push(piece);

    if (end === cleaned.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }

  return chunks;
};

export const getGeminiEmbedding = async (text: string): Promise<number[]> => {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  const values = result.embedding?.values;

  if (!values || values.length === 0) {
    throw new Error("Failed to generate embedding");
  }

  return values;
};

export const embedChunks = async (chunks: string[]): Promise<number[][]> => {
  const vectors: number[][] = [];
  for (const chunk of chunks) {
    vectors.push(await getGeminiEmbedding(chunk));
  }
  return vectors;
};

export const vectorSearchChunks = async ({
  sessionId,
  userId,
  queryEmbedding,
  limit = 6,
}: {
  sessionId: string;
  userId: string;
  queryEmbedding: number[];
  limit?: number;
}) => {
  const docs = await ResumeChunk.aggregate([
    {
      $vectorSearch: {
        index: "resume_chunks_vector_idx",
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: 100,
        limit,
        filter: {
          sessionId: new Types.ObjectId(sessionId),
          userId: new Types.ObjectId(userId),
        },
      },
    },
    {
      $project: {
        text: 1,
        chunkIndex: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  return docs as { text: string; chunkIndex: number; score: number }[];
};

interface ChatWithGeminiParams {
  systemPrompt: string;
  contextChunks: string[];
  chatHistory: { role: "user" | "assistant"; content: string }[];
  userPrompt: string;
  webResults?: { title: string; url: string; snippet: string }[];
}

export const chatWithGemini = async ({
  systemPrompt,
  contextChunks,
  chatHistory,
  userPrompt,
  webResults = [],
}: ChatWithGeminiParams): Promise<string> => {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: CHAT_MODEL });

  const contextBlock = contextChunks
    .map((c, i) => `Chunk ${i + 1}:\n${c}`)
    .join("\n\n");

  const historyBlock = chatHistory
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const webBlock =
    webResults.length > 0
      ? webResults
          .map(
            (r, i) =>
              `${i + 1}. ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`
          )
          .join("\n\n")
      : "No web results";

  const prompt = `${systemPrompt}

RESUME CONTEXT:
${contextBlock}

RECENT CHAT:
${historyBlock}

WEB JOB RESULTS (if any):
${webBlock}

USER QUESTION:
${userPrompt}

Answer clearly and practically. If listing jobs, include title + URL.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
};

export const isJobSearchIntent = (message: string): boolean => {
  const lower = message.toLowerCase();
  return (
    lower.includes("find job") ||
    lower.includes("find jobs") ||
    lower.includes("search job") ||
    lower.includes("job openings") ||
    lower.includes("hiring")
  );
};
```

---

## Step 3.5 — Create Tavily web search helper

### File: `lib/ai/web-search.ts` (new)

```ts
export interface WebJobResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

export async function searchJobsOnWeb(
  query: string,
  maxResults = 10
): Promise<WebJobResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("Missing TAVILY_API_KEY");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      search_depth: "advanced",
      include_answer: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.status}`);
  }

  const data = await response.json();

  return (data.results || []).slice(0, maxResults).map((item: any) => ({
    title: item.title || "Untitled",
    url: item.url,
    snippet: item.content || "",
    source: item.source,
  }));
}
```

---

## Step 3.6 — Create server actions (core business logic)

### File: `lib/actions/jobChat.action.ts` (new)

```ts
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
  vectorSearchChunks,
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
  const matchedChunks = await vectorSearchChunks({
    sessionId: String(session._id),
    userId: String(user._id),
    queryEmbedding,
    limit: 6,
  });

  let webResults: { title: string; url: string; snippet: string }[] = [];
  if (isJobSearchIntent(trimmed)) {
    webResults = await searchJobsOnWeb(trimmed, 10);
  }

  const assistantText = await chatWithGemini({
    systemPrompt:
      "You are QueueOverFlow Jobs AI Coach. Help users improve resumes and find jobs. Be specific and actionable.",
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

export async function resetActiveSession({ clerkId }: ResetActiveSessionParams) {
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
```

---

## Step 3.7 — Create API routes

Create these folders/files:

- `app/api/jobs/session/route.ts`
- `app/api/jobs/chat/route.ts`
- `app/api/jobs/messages/route.ts`

---

### File: `app/api/jobs/session/route.ts`

```ts
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
```

---

### File: `app/api/jobs/chat/route.ts`

```ts
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { sendJobChatMessage } from "@/lib/actions/jobChat.action";

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const message = body?.message;

    const data = await sendJobChatMessage({ clerkId: userId, message });
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}
```

---

### File: `app/api/jobs/messages/route.ts`

```ts
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { getSessionMessages } from "@/lib/actions/jobChat.action";

export async function GET(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
```

---

## Step 3.8 — Replace OpenAI route with Gemini

### File: `app/api/chatgpt/route.ts`

Replace entire file with:

```ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const POST = async (request: Request) => {
  const { question } = await request.json();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a knowledgeable programming assistant.
Answer this question clearly with examples when useful:

${question}`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    return NextResponse.json({ reply });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
```

This keeps your existing Question page button working without OpenAI.

---

## Step 3.9 — Backend verification checklist

1. Start app: `npm run dev`
2. Sign in.
3. Use Postman or browser fetch:

```js
// In browser console while logged in
await fetch('/api/jobs/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ resumeText: 'A'.repeat(250) })
}).then(r => r.json())
```

4. Confirm response `ok: true`.
5. In MongoDB Atlas, verify collections now contain docs:
   - `resumesessions`
   - `resumechunks`
   - `jobchatmessages` (after first chat message)

Then continue to `04-file-by-file-frontend-code.md`.
