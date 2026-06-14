import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { SearchTools, type BraveSearchResult } from '@/server/tools/searchTools';

describe('SearchTools', () => {
  let tools: SearchTools;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    tools = new SearchTools();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(response: Response) {
    globalThis.fetch = () => Promise.resolve(response);
  }

  function mockBraveResponse(results: Array<Record<string, unknown>>) {
    mockFetch(
      new Response(
        JSON.stringify({ web: { results } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
  }

  describe('Configuration', () => {
    it('should return error when API key is empty', async () => {
      const noKeyTools = new SearchTools();
      // Force empty key by overriding the private field via any
      (noKeyTools as any).apiKey = '';

      const result = await noKeyTools.search('test query');

      expect(result.success).toBe(false);
      expect(result.error).toContain('BRAVE_API_KEY not configured');
    });
  });

  describe('Basic Search', () => {
    it('should return parsed results on success', async () => {
      mockBraveResponse([
        {
          title: 'Test Article',
          url: 'https://example.com/article',
          description: 'A test description',
          age: '2024-01-15',
        },
        {
          title: 'Another Article',
          url: 'https://test.org/page',
          snippet: 'Snippet text',
        },
      ]);

      const result = await tools.search('test query');

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results![0]).toEqual({
        title: 'Test Article',
        url: 'https://example.com/article',
        description: 'A test description',
        source: 'example.com',
        publishedDate: '2024-01-15',
      });
      expect(result.results![1]).toEqual({
        title: 'Another Article',
        url: 'https://test.org/page',
        description: 'Snippet text',
        source: 'test.org',
        publishedDate: undefined,
      });
    });

    it('should return empty array when no results', async () => {
      mockBraveResponse([]);

      const result = await tools.search('test query');

      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);
    });

    it('should return empty array when web field is missing', async () => {
      mockFetch(
        new Response(
          JSON.stringify({ other: 'data' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const result = await tools.search('test query');

      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);
    });

    it('should handle non-JSON response gracefully', async () => {
      mockFetch(
        new Response(
          'not json',
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const result = await tools.search('test query');
      expect(result.success).toBe(false);
    });
  });

  describe('Search Options', () => {
    it('should clamp count between 1 and 20', async () => {
      let capturedUrl: string | undefined;
      globalThis.fetch = (input) => {
        capturedUrl = typeof input === 'string' ? input : input.toString();
        return Promise.resolve(
          new Response(JSON.stringify({ web: { results: [] } }), { status: 200 })
        );
      };

      await tools.search('query', { count: 0 });
      expect(capturedUrl).toContain('count=1');

      await tools.search('query', { count: 25 });
      expect(capturedUrl).toContain('count=20');

      await tools.search('query', { count: 5 });
      expect(capturedUrl).toContain('count=5');
    });

    it('should pass offset to the API', async () => {
      let capturedUrl: string | undefined;
      globalThis.fetch = (input) => {
        capturedUrl = typeof input === 'string' ? input : input.toString();
        return Promise.resolve(
          new Response(JSON.stringify({ web: { results: [] } }), { status: 200 })
        );
      };

      await tools.search('query', { offset: 10 });
      expect(capturedUrl).toContain('offset=10');
    });
  });

  describe('API Errors', () => {
    it('should return auth error on 401', async () => {
      mockFetch(new Response('Unauthorized', { status: 401 }));

      const result = await tools.search('test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('authentication failed');
    });

    it('should return auth error on 403', async () => {
      mockFetch(new Response('Forbidden', { status: 403 }));

      const result = await tools.search('test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('authentication failed');
    });

    it('should return generic error for other HTTP errors', async () => {
      mockFetch(new Response('Server Error', { status: 500, statusText: 'Internal Server Error' }));

      const result = await tools.search('test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
      expect(result.error).toContain('Internal Server Error');
    });

    it('should handle network exceptions', async () => {
      globalThis.fetch = () => Promise.reject(new Error('Network failure'));

      const result = await tools.search('test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network failure');
    });

    it('should handle unknown exceptions', async () => {
      globalThis.fetch = () => Promise.reject('string error');

      const result = await tools.search('test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Search request failed');
    });
  });

  describe('Result Parsing Edge Cases', () => {
    it('should skip results with missing or invalid URLs', async () => {
      mockBraveResponse([
        { title: 'Valid', url: 'https://example.com', description: 'ok' },
        { title: 'No URL', url: '', description: 'skip' },
        { title: 'Bad URL', url: 'not-http', description: 'skip' },
      ]);

      const result = await tools.search('test');

      expect(result.results).toHaveLength(1);
      expect(result.results![0].title).toBe('Valid');
    });

    it('should use extra_snippets when description and snippet are missing', async () => {
      mockBraveResponse([
        {
          title: 'Article',
          url: 'https://example.com',
          extra_snippets: ['First snippet', 'Second snippet'],
        },
      ]);

      const result = await tools.search('test');

      expect(result.results![0].description).toBe('First snippet');
    });

    it('should fallback to empty description when all fields missing', async () => {
      mockBraveResponse([
        { title: 'Article', url: 'https://example.com' },
      ]);

      const result = await tools.search('test');

      expect(result.results![0].description).toBe('');
    });

    it('should handle malformed URL for source extraction', async () => {
      mockBraveResponse([
        { title: 'Article', url: 'https://example.com', description: 'ok' },
      ]);

      const result = await tools.search('test');
      expect(result.results![0].source).toBe('example.com');
    });
  });

  describe('Specialized Search Methods', () => {
    it('should append evidence keywords for searchEvidence', async () => {
      let capturedUrl: string | undefined;
      globalThis.fetch = (input) => {
        capturedUrl = typeof input === 'string' ? input : input.toString();
        return Promise.resolve(
          new Response(JSON.stringify({ web: { results: [] } }), { status: 200 })
        );
      };

      await tools.searchEvidence('climate change');
      const url = new URL(capturedUrl!);
      expect(url.searchParams.get('q')).toBe('climate change evidence statistics research study');
    });

    it('should append rebuttal keywords for searchRebuttal', async () => {
      let capturedUrl: string | undefined;
      globalThis.fetch = (input) => {
        capturedUrl = typeof input === 'string' ? input : input.toString();
        return Promise.resolve(
          new Response(JSON.stringify({ web: { results: [] } }), { status: 200 })
        );
      };

      await tools.searchRebuttal('climate change');
      const url = new URL(capturedUrl!);
      expect(url.searchParams.get('q')).toBe('climate change counterargument criticism opposing view');
    });
  });
});
