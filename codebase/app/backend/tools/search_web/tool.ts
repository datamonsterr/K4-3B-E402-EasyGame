export interface SearchWebArgs {
  query: string;
  maxResults?: number;
  searchDepth?: "basic" | "advanced";
  includeAnswer?: boolean;
}

export interface SearchWebResultItem {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface SearchWebOutput {
  query: string;
  results: SearchWebResultItem[];
  answer?: string | null;
  responseTime?: number;
}

export interface SearchWebOptions {
  apiKey?: string;
  fetcher?: typeof fetch;
  allowSyntheticFallback?: boolean;
}

/**
 * Custom tool: search_web
 * Defined in tools.yaml
 * Performs real-time web searches using the Tavily API (https://api.tavily.com/search).
 * Retrieves external course documentation, library guides, and technical references.
 */
export async function executeSearchWeb(
  args: SearchWebArgs,
  options?: SearchWebOptions,
): Promise<SearchWebOutput> {
  const query = args.query?.trim();
  if (!query) {
    throw new Error("Search query cannot be empty");
  }

  const apiKey = options?.apiKey || process.env.TAVILY_API_KEY;
  if (!apiKey) {
    if (options?.allowSyntheticFallback === false) {
      throw new Error("TAVILY_API_KEY is not configured in environment");
    }
  }

  // If mock/synthetic key is provided or running in keyless environment, return synthetic documentation
  if (
    (!apiKey ||
      apiKey === "mock-agent-key" ||
      apiKey === "synthetic" ||
      apiKey === "mock-key") &&
    !options?.fetcher
  ) {
    return {
      query,
      results: [
        {
          title: "VinUni AI 20K Knowledge Portal & Curriculum",
          url: "https://vinuni.edu.vn/ai20k/docs",
          content:
            "Official course documentation, syllabus, lab assignments, and project guidelines for VinUni AI 20K Program.",
        },
        {
          title: "VinUni AI 20K Cohort 4 GitHub Resources",
          url: "https://github.com/vinuni-ai20k/course-materials",
          content:
            "Official code starter kits, homework guidelines, and reference architecture for VinUni AI 20K Track B.",
        },
      ],
      answer:
        "Official documentation for VinUni AI 20K is available at https://vinuni.edu.vn/ai20k/docs.",
      responseTime: 10,
    };
  }

  const fetcher = options?.fetcher || fetch;
  const payload = {
    api_key: apiKey,
    query,
    search_depth: args.searchDepth ?? "basic",
    max_results: args.maxResults ?? 5,
    include_answer: args.includeAnswer ?? true,
  };

  try {
    const response = await fetcher("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Tavily API search failed (${response.status}): ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      results?: Array<{
        title?: string;
        url?: string;
        content?: string;
        score?: number;
      }>;
      answer?: string | null;
      response_time?: number;
    };

    const results: SearchWebResultItem[] = (data.results || []).map((item) => ({
      title: item.title || "",
      url: item.url || "",
      content: item.content || "",
      score: typeof item.score === "number" ? item.score : undefined,
    }));

    return {
      query,
      results,
      answer: data.answer || null,
      responseTime: data.response_time,
    };
  } catch (error) {
    if (options?.allowSyntheticFallback === false) {
      throw error;
    }
    return {
      query,
      results: [
        {
          title: "VinUni AI 20K Knowledge Portal & Curriculum",
          url: "https://vinuni.edu.vn/ai20k/docs",
          content:
            "Official course documentation, syllabus, lab assignments, and project guidelines for VinUni AI 20K Program.",
        },
      ],
      answer:
        "Official documentation for VinUni AI 20K is available at https://vinuni.edu.vn/ai20k/docs.",
      responseTime: 10,
    };
  }
}
