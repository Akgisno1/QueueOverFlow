import { Types } from "mongoose";
import ResumeChunk from "@/database/resumeChunk.model";
import { generateChatCompletion, generateEmbedding } from "@/lib/ai/gemini";

const CHUNK_SIZE = 700;
const CHUNK_OVERLAP = 120;

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

export const getGeminiEmbedding = generateEmbedding;

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

export const retrieveContextChunks = async ({
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
  try {
    const vectorResults = await vectorSearchChunks({
      sessionId,
      userId,
      queryEmbedding,
      limit,
    });

    if (vectorResults.length > 0) return vectorResults;
  } catch (error) {
    console.warn("Vector search unavailable, falling back to stored chunks", error);
  }

  const fallbackChunks = await ResumeChunk.find({
    sessionId,
    userId,
  })
    .sort({ chunkIndex: 1 })
    .limit(limit)
    .select("text chunkIndex");

  return fallbackChunks.map((chunk) => ({
    text: chunk.text,
    chunkIndex: chunk.chunkIndex,
    score: 0,
  }));
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
  const contextBlock =
    contextChunks.length > 0
      ? contextChunks.map((c, i) => `Chunk ${i + 1}:\n${c}`).join("\n\n")
      : "No resume chunks retrieved.";

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

  return generateChatCompletion(prompt);
};

export const isJobSearchIntent = (message: string): boolean => {
  const lower = message.toLowerCase();
  return (
    lower.includes("find job") ||
    lower.includes("find jobs") ||
    lower.includes("search job") ||
    lower.includes("job openings") ||
    lower.includes("hiring") ||
    lower.includes("remote") ||
    lower.includes("salary") ||
    lower.includes("location")
  );
};
