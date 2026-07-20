export async function parseApiResponse<T = unknown>(
  response: Response
): Promise<T> {
  const text = await response.text();

  if (!text) {
    if (response.status === 504) {
      throw new Error(
        "Request timed out. The AI took too long — please try a shorter question."
      );
    }
    throw new Error(`Empty server response (${response.status})`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    if (response.status === 504) {
      throw new Error(
        "Request timed out. The AI took too long — please try a shorter question."
      );
    }

    if (response.status === 429) {
      throw new Error(
        "Rate limit reached. Please wait a moment and try again."
      );
    }

    const preview = text.slice(0, 160).replace(/\s+/g, " ").trim();
    throw new Error(
      preview || `Server returned invalid JSON (${response.status})`
    );
  }
}
