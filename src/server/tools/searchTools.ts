const BRAVE_API_KEY = process.env.BRAVE_API_KEY || "";

export interface BraveSearchResult {
  success: boolean;
  results?: SearchResultItem[];
  error?: string;
}

export interface SearchResultItem {
  title: string;
  url: string;
  description: string;
  source?: string;
  publishedDate?: string;
}

export class SearchTools {
  private apiKey: string;
  private baseUrl = "https://api.search.brave.com/res/v1/web/search";

  constructor() {
    this.apiKey = BRAVE_API_KEY;
  }

  /**
   * Search the web using Brave Search API.
   * Useful for debater and judge agents to find evidence.
   */
  async search(query: string, options?: {
    count?: number;
    offset?: number;
  }): Promise<BraveSearchResult> {
    try {
      if (!this.apiKey || this.apiKey.trim() === "") {
        return {
          success: false,
          error: "BRAVE_API_KEY not configured. Set it in your .env file.",
        };
      }

      const count = Math.min(Math.max(options?.count ?? 10, 1), 20);
      const offset = options?.offset ?? 0;

      const url = new URL(this.baseUrl);
      url.searchParams.set("q", query);
      url.searchParams.set("count", String(count));
      url.searchParams.set("offset", String(offset));

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": this.apiKey,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            error: `Brave Search API authentication failed. Check your BRAVE_API_KEY.`,
          };
        }
        return {
          success: false,
          error: `Brave Search API error: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();
      const results = this.parseResults(data);

      return {
        success: true,
        results,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Search request failed",
      };
    }
  }

  /**
   * Search for evidence related to a debate claim.
   */
  async searchEvidence(claim: string): Promise<BraveSearchResult> {
    const evidenceQuery = `${claim} evidence statistics research study`;
    return this.search(evidenceQuery, { count: 10 });
  }

  /**
   * Search for rebuttal evidence against a claim.
   */
  async searchRebuttal(claim: string): Promise<BraveSearchResult> {
    const rebuttalQuery = `${claim} counterargument criticism opposing view`;
    return this.search(rebuttalQuery, { count: 10 });
  }

  private parseResults(data: unknown): SearchResultItem[] {
    if (!data || typeof data !== "object") return [];

    const results: SearchResultItem[] = [];

    // Brave Search API returns results in web.results
    const webData = (data as Record<string, unknown>).web;
    if (webData && Array.isArray((webData as Record<string, unknown>).results)) {
      const webResults = (webData as Record<string, unknown>).results as Array<Record<string, unknown>>;

      for (const item of webResults) {
        if (!item || typeof item !== "object") continue;

        const title = String(item.title ?? "");
        const url = String(item.url ?? "");
        const description = String(
          item.description ?? item.snippet ?? item.extra_snippets?.[0] ?? ""
        );

        if (url && url.startsWith("http")) {
          results.push({
            title,
            url,
            description,
            source: this.extractSource(url),
            publishedDate: item.age ? String(item.age) : undefined,
          });
        }
      }
    }

    return results;
  }

  private extractSource(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }
}

export const searchTools = new SearchTools();
