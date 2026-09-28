export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface TavilySearchResponse {
  query: string;
  results: TavilySearchResult[];
}

const DEFAULT_TAVILY_API_KEY = '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';

/**
 * Tavily APIを使用してWeb検索を実行する
 */
export async function searchTavily(query: string, apiKey?: string): Promise<TavilySearchResult[]> {
  const effectiveApiKey = apiKey || process.env.TAVILY_API_KEY || DEFAULT_TAVILY_API_KEY;

  if (!effectiveApiKey || !query) {
    return [];
  }

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: effectiveApiKey,
        query: query.slice(0, 400),
        search_depth: 'basic',
        include_answer: false,
        max_results: 3,
      }),
    });

    if (!res.ok) {
      console.warn(`Tavily API error (${res.status}):`, await res.text());
      return [];
    }

    const data: TavilySearchResponse = await res.json();
    return data.results || [];
  } catch (err) {
    console.warn('Tavily search exception:', err);
    return [];
  }
}
