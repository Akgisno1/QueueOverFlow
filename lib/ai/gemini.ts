import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_CHAT_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
];

const DEFAULT_EMBEDDING_MODELS = [
  "gemini-embedding-2",
  "text-embedding-004",
  "gemini-embedding-001",
];

export const EMBEDDING_DIMENSIONS = 768;

const getApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(
      "❌ [Gemini Env Error] Missing GEMINI_API_KEY in environment variables."
    );
    throw new Error("Missing GEMINI_API_KEY");
  }
  return apiKey;
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
  let lastRestError = "Unknown REST error";

  const body: Record<string, unknown> = {
    content: {
      parts: [{ text }],
    },
  };

  if (
    [
      "gemini-embedding-2",
      "text-embedding-004",
      "gemini-embedding-001",
    ].includes(model)
  ) {
    body.outputDimensionality = EMBEDDING_DIMENSIONS;
  }

  for (const version of ["v1", "v1beta"] as const) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/${version}/models/${model}:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        lastRestError = data?.error?.message || `HTTP ${response.status}`;
        console.error(
          `⚠️ [Gemini REST Embedding Error] Model: ${model}, Version: ${version}. Message: ${lastRestError}`
        );
        continue;
      }

      if (data?.embedding?.values?.length) {
        return normalizeEmbedding(data.embedding.values as number[]);
      }
    } catch (fetchError: any) {
      lastRestError = fetchError?.message || lastRestError;
      console.error(
        `🚨 [Gemini REST Embedding Exception] Model: ${model}, Version: ${version}. Exception:`,
        fetchError
      );
    }
  }

  throw new Error(`Embedding model "${model}" is unavailable`);
};

const embedWithSdk = async (model: string, text: string): Promise<number[]> => {
  try {
    const genAI = new GoogleGenerativeAI(getApiKey());
    const embeddingModel = genAI.getGenerativeModel({ model });
    const result = await embeddingModel.embedContent(text);
    const values = result.embedding?.values;

    if (!values?.length) {
      throw new Error(`Embedding model "${model}" returned empty vector`);
    }

    return normalizeEmbedding(values);
  } catch (sdkError: any) {
    console.error(
      `⚠️ [Gemini SDK Embedding Error] Model: ${model}. Message:`,
      sdkError?.message || sdkError
    );
    throw sdkError;
  }
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
      try {
        return await embedWithRest(model, text);
      } catch (restError: any) {
        lastError = restError?.message || lastError;
      }
    }
  }

  throw new Error(
    `Gemini embedding failed. ${lastError}. Verify GEMINI_API_KEY and enabled models in Google AI Studio.`
  );
};

const generateWithRest = async (
  model: string,
  prompt: string
): Promise<string> => {
  const apiKey = getApiKey();
  let lastRestError = "Unknown REST error";

  for (const version of ["v1", "v1beta"] as const) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        lastRestError = data?.error?.message || `HTTP ${response.status}`;
        console.error(
          `⚠️ [Gemini REST Chat Error] Model: ${model}, Version: ${version}. Message: ${lastRestError}`
        );
        continue;
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (fetchError: any) {
      lastRestError = fetchError?.message || lastRestError;
      console.error(
        `🚨 [Gemini REST Chat Exception] Model: ${model}, Version: ${version}. Exception:`,
        fetchError
      );
    }
  }

  throw new Error(`REST fallback failed: ${lastRestError}`);
};

export const generateChatCompletion = async (
  prompt: string
): Promise<string> => {
  const configured = process.env.GEMINI_CHAT_MODEL;
  const models = configured
    ? [configured, ...DEFAULT_CHAT_MODELS.filter((m) => m !== configured)]
    : DEFAULT_CHAT_MODELS;

  const detailedErrors: string[] = [];

  for (const model of models) {
    try {
      const genAI = new GoogleGenerativeAI(getApiKey());
      const chatModel = genAI.getGenerativeModel({ model });
      const result = await chatModel.generateContent(prompt);
      const text = result.response.text();
      if (text) return text;
    } catch (sdkError: any) {
      const sdkMsg = `[SDK - ${model}]: ${sdkError?.message}`;
      detailedErrors.push(sdkMsg);
      console.error(
        `⚠️ [Gemini SDK Chat Error] Attempting model ${model} failed. Error:`,
        sdkError?.message || sdkError
      );

      try {
        return await generateWithRest(model, prompt);
      } catch (restError: any) {
        const restMsg = `[REST - ${model}]: ${restError?.message}`;
        detailedErrors.push(restMsg);
        console.error(
          `🚨 [Gemini REST Fallback Error] Model ${model} failed REST fallback. Error:`,
          restError?.message || restError
        );
      }
    }
  }

  const finalError = `Gemini chat failed.\n\nDebug Log:\n${detailedErrors.join(
    "\n"
  )}\n\nPlease check your configuration.`;
  console.error(
    `❌ [Gemini Critical Failure] All configured models failed to generate content.\n`,
    finalError
  );
  throw new Error(finalError);
};
