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
