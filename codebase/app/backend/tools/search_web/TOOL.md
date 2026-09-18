# Tool: search_web

Performs web search queries via the Tavily Search API (`https://api.tavily.com/search`) to retrieve external course documentation, technical references, and official library guides.

## Schema

- `name`: `search_web`
- `parameters`:
  - `query`: string (required) - search query for course or technical information.
  - `maxResults`: integer (optional, default 5) - maximum number of search results to return.
  - `searchDepth`: string (optional, "basic" | "advanced", default "basic") - search depth level.
  - `includeAnswer`: boolean (optional, default true) - whether to include a synthesized answer summary.

## Behavior

- Authenticates via `TAVILY_API_KEY` from environment variables or explicitly passed options.
- Returns normalized structured results including titles, URLs, contents, and relevance scores.
- Validates query strings and rejects empty requests.
