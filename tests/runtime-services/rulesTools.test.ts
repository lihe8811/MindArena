import { describe, it, expect } from 'bun:test';
import { RulesTools } from '@/server/tools/rulesTools';

function createMockDb(returnValues: unknown[][]) {
  let callIndex = 0;

  const builder = {
    from() {
      return this;
    },
    where() {
      return this;
    },
    limit() {
      return this;
    },
    orderBy() {
      return this;
    },
    innerJoin() {
      return this;
    },
    then(onFulfilled?: (value: unknown) => unknown) {
      const value = returnValues[callIndex] ?? [];
      callIndex += 1;
      return Promise.resolve(value).then(onFulfilled);
    },
  };

  return {
    select() {
      return builder;
    },
    _callIndex() {
      return callIndex;
    },
  } as any;
}

const mockRuleDoc = {
  id: 'rule-1',
  title: 'Evidence Citation Rules',
  category: 'Debate Ethics',
  summary: 'How to cite evidence properly',
  sourceType: 'rule',
  chunkCount: 3,
  wordCount: 450,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-06-01'),
};

const mockRuleDoc2 = {
  id: 'rule-2',
  title: 'Cross-examination Protocol',
  category: 'Procedure',
  summary: 'Rules for cross-examination',
  sourceType: 'rule',
  chunkCount: 2,
  wordCount: 300,
  createdAt: new Date('2024-02-01'),
  updatedAt: new Date('2024-05-01'),
};

describe('RulesTools', () => {
  describe('listRules', () => {
    it('should return all rule documents', async () => {
      const mockDb = createMockDb([[mockRuleDoc, mockRuleDoc2]]);
      const tools = new RulesTools(mockDb);

      const result = await tools.listRules();

      expect(result.success).toBe(true);
      expect(result.rules).toHaveLength(2);
      expect(result.rules![0].title).toBe('Evidence Citation Rules');
    });

    it('should handle database errors', async () => {
      const mockDb = createMockDb([]);
      mockDb.select = () => {
        throw new Error('DB connection lost');
      };
      const tools = new RulesTools(mockDb);

      const result = await tools.listRules();

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB connection lost');
    });
  });

  describe('searchRules', () => {
    it('should return matching chunks', async () => {
      const mockDb = createMockDb([
        [
          {
            documentId: 'rule-1',
            title: 'Evidence Citation Rules',
            category: 'Debate Ethics',
            chunkIndex: 0,
            text: 'All evidence must include author qualifications and publication date.',
          },
        ],
      ]);
      const tools = new RulesTools(mockDb);

      const result = await tools.searchRules('evidence must include', 5);

      expect(result.success).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches![0].text).toContain('author qualifications');
    });

    it('should return empty array for empty query', async () => {
      const mockDb = createMockDb([]);
      const tools = new RulesTools(mockDb);

      const result = await tools.searchRules('   ');

      expect(result.success).toBe(true);
      expect(result.matches).toEqual([]);
    });
  });

  describe('getRuleById', () => {
    it('should return rule with chunks', async () => {
      const mockDb = createMockDb([
        [mockRuleDoc],
        [
          { chunkIndex: 0, text: 'Chunk 0' },
          { chunkIndex: 1, text: 'Chunk 1' },
        ],
      ]);
      const tools = new RulesTools(mockDb);

      const result = await tools.getRuleById('rule-1');

      expect(result.success).toBe(true);
      expect(result.rule).toBeDefined();
      expect(result.rule!.title).toBe('Evidence Citation Rules');
      expect(result.rule!.chunks).toHaveLength(2);
      expect(result.rule!.chunks[0].text).toBe('Chunk 0');
    });

    it('should return error when rule not found', async () => {
      const mockDb = createMockDb([[]]);
      const tools = new RulesTools(mockDb);

      const result = await tools.getRuleById('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rule not found');
    });
  });

  describe('getRulesForDebate', () => {
    it('should return rules linked to a debate', async () => {
      const mockDb = createMockDb([
        [{ knowledgeDocumentId: 'rule-1' }, { knowledgeDocumentId: 'rule-2' }],
        [mockRuleDoc, mockRuleDoc2],
      ]);
      const tools = new RulesTools(mockDb);

      const result = await tools.getRulesForDebate('debate-123');

      expect(result.success).toBe(true);
      expect(result.rules).toHaveLength(2);
    });

    it('should return empty array when no links exist', async () => {
      const mockDb = createMockDb([[]]);
      const tools = new RulesTools(mockDb);

      const result = await tools.getRulesForDebate('debate-456');

      expect(result.success).toBe(true);
      expect(result.rules).toEqual([]);
    });
  });

  describe('findRulesByTitleOrCategory', () => {
    it('should match by title', async () => {
      const mockDb = createMockDb([[mockRuleDoc]]);
      const tools = new RulesTools(mockDb);

      const result = await tools.findRulesByTitleOrCategory('Citation');

      expect(result.success).toBe(true);
      expect(result.rules).toHaveLength(1);
      expect(result.rules![0].title).toBe('Evidence Citation Rules');
    });

    it('should match by category', async () => {
      const mockDb = createMockDb([[mockRuleDoc2]]);
      const tools = new RulesTools(mockDb);

      const result = await tools.findRulesByTitleOrCategory('Procedure');

      expect(result.success).toBe(true);
      expect(result.rules![0].category).toBe('Procedure');
    });

    it('should return empty array for empty query', async () => {
      const mockDb = createMockDb([]);
      const tools = new RulesTools(mockDb);

      const result = await tools.findRulesByTitleOrCategory('');

      expect(result.success).toBe(true);
      expect(result.rules).toEqual([]);
    });
  });
});
