import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_CHAT_MODELS = [
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-flash",
];

const DEFAULT_EMBEDDING_MODELS = [
  "text-embedding-004",
  "gemini-embedding-001",
];

export const EMBEDDING_DIMENSIONS = 768;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  return apiKey;
};

const isQuotaError = (message: string) =>
  /429|quota|rate.?limit|too many requests|exceeded your current quota/i.test(
    message
  );

const getRetryDelayMs = (message: string): number => {
  const match = message.match(/retry in ([0-9.]+)s/i);
  if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 500;
  return 3000;
};

export const normalizeEmbedding = (vector: number[]): number[] => {
  const trimmed = vector.slice(0, EMBEDDING_DIMENSIONS);
  const magnitude = Math.sqrt(
    trimmed.reduce((sum, value) => sum + value * value, 0)
  );
  if (magnitude === 0) return trimmed;
  return trimmed.map((value) => value / magnitude);
};

const embedWithRest = async (
  model: string,
  text: string
): Promise<number[]> => {
  const apiKey = getApiKey();
  const body: Record<string, unknown> = {
    content: { parts: [{ text }] },
  };

  if (model === "gemini-embedding-001") {
    body.outputDimensionality = EMBEDDING_DIMENSIONS;
  }

  for (const version of ["v1", "v1beta"] as const) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/${version}/models/${model}:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    if (response.ok && data?.embedding?.values?.length) {
      return normalizeEmbedding(data.embedding.values as number[]);
    }

    const errorMessage = data?.error?.message || `HTTP ${response.status}`;
    if (isQuotaError(errorMessage)) {
      throw new Error(
        "Gemini embedding rate limit reached. Please wait 30 seconds and try again."
      );
    }
  }

  throw new Error(`Embedding model "${model}" is unavailable`);
};

const embedWithSdk = async (model: string, text: string): Promise<number[]> => {
  const genAI = new GoogleGenerativeAI(getApiKey());
  const embeddingModel = genAI.getGenerativeModel({ model });
  const result = await embeddingModel.embedContent(text);
  const values = result.embedding?.values;

  if (!values?.length) {
    throw new Error(`Embedding model "${model}" returned empty vector`);
  }

  return normalizeEmbedding(values);
};

export const generateEmbedding = async (text: string): Promise<number[]> => {
  const configured = process.env.GEMINI_EMBEDDING_MODEL;
  const models = configured
    ? [configured, ...DEFAULT_EMBEDDING_MODELS.filter((m) => m !== configured)]
    : DEFAULT_EMBEDDING_MODELS;

  let lastError = "Unknown embedding error";

  for (const model of models) {
    try {
      return await embedWithSdk(model, text);
    } catch (sdkError: any) {
      lastError = sdkError?.message || lastError;

      if (isQuotaError(lastError)) {
        await sleep(getRetryDelayMs(lastError));
        try {
          return await embedWithSdk(model, text);
        } catch {
          continue;
        }
      }

      try {
        return await embedWithRest(model, text);
      } catch (restError: any) {
        lastError = restError?.message || lastError;
      }
    }
  }

  throw new Error(
    `Gemini embedding failed. ${lastError}. Check GEMINI_API_KEY in Google AI Studio.`
  );
};

const generateWithSdk = async (
  model: string,
  prompt: string
): Promise<string> => {
  const genAI = new GoogleGenerativeAI(getApiKey());
  const chatModel = genAI.getGenerativeModel({ model });
  const result = await chatModel.generateContent(prompt);
  const text = result.response.text();
  if (!text) throw new Error(`Chat model "${model}" returned empty response`);
  return text;
};

export const generateChatCompletion = async (
  prompt: string
): Promise<string> => {
  const configured = process.env.GEMINI_CHAT_MODEL;
  const models = configured
    ? [configured, ...DEFAULT_CHAT_MODELS.filter((m) => m !== configured)]
    : DEFAULT_CHAT_MODELS;

  let lastError = "Unknown chat error";
  let sawQuotaError = false;

  for (const model of models) {
    try {
      return await generateWithSdk(model, prompt);
    } catch (sdkError: any) {
      lastError = sdkError?.message || lastError;
      console.error(`[Gemini] Model ${model} failed:`, lastError);

      if (isQuotaError(lastError)) {
        sawQuotaError = true;
        await sleep(getRetryDelayMs(lastError));
        try {
          return await generateWithSdk(model, prompt);
        } catch (retryError: any) {
          lastError = retryError?.message || lastError;
          continue;
        }
      }
    }
  }

  if (sawQuotaError) {
    throw new Error(
      "Gemini rate limit reached on free tier. Wait 30–60 seconds, then try again with a shorter message."
    );
  }

  throw new Error(
    `Gemini chat failed. ${lastError}. Set GEMINI_CHAT_MODEL=gemini-2.0-flash-lite in .env.local.`
  );
};
