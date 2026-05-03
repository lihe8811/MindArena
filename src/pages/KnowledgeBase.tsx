import React, { useMemo, useState } from 'react';
import { FileSearch, FileUp, Scale, Search } from 'lucide-react';
import type { KnowledgeDocument, KnowledgeSearchResponse } from '@/types';

interface KnowledgeBaseProps {
  documents: KnowledgeDocument[];
  onCreateRule: (payload: { title: string; category: string; content: string }) => Promise<void>;
  onUploadFile: (payload: { file: File; title?: string; category?: string }) => Promise<void>;
  onSearch: (query: string) => Promise<void>;
  searchResult: KnowledgeSearchResponse | null;
  isSubmitting?: boolean;
}

export function KnowledgeBase({
  documents,
  onCreateRule,
  onUploadFile,
  onSearch,
  searchResult,
  isSubmitting,
}: KnowledgeBaseProps) {
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleCategory, setRuleCategory] = useState('Rules');
  const [ruleContent, setRuleContent] = useState('');
  const [fileTitle, setFileTitle] = useState('');
  const [fileCategory, setFileCategory] = useState('Uploaded File');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [query, setQuery] = useState('');

  const stats = useMemo(() => {
    const chunkTotal = documents.reduce((sum, item) => sum + item.chunkCount, 0);
    const wordTotal = documents.reduce((sum, item) => sum + item.wordCount, 0);

    return {
      documentTotal: documents.length,
      chunkTotal,
      wordTotal,
    };
  }, [documents]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-4xl font-bold tracking-tight text-on-surface">Knowledge Base</h2>
        <p className="mt-2 text-secondary">上传规则、知识文档和资料文件，系统会解析、切块并写入本地向量数据库。</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="文档数" value={String(stats.documentTotal)} />
        <StatCard label="向量分块" value={String(stats.chunkTotal)} />
        <StatCard label="总词数" value={String(stats.wordTotal)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-3xl border border-outline-variant bg-surface-container p-6">
          <div className="flex items-center gap-3">
            <Scale className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold text-on-surface">录入规则</h3>
          </div>
          <form
            className="mt-6 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              await onCreateRule({
                title: ruleTitle,
                category: ruleCategory,
                content: ruleContent,
              });
              setRuleTitle('');
              setRuleCategory('Rules');
              setRuleContent('');
            }}
          >
            <input
              value={ruleTitle}
              onChange={(event) => setRuleTitle(event.target.value)}
              placeholder="规则标题"
              className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-on-surface outline-none focus:border-primary"
            />
            <input
              value={ruleCategory}
              onChange={(event) => setRuleCategory(event.target.value)}
              placeholder="分类，例如 Debate Rules"
              className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-on-surface outline-none focus:border-primary"
            />
            <textarea
              value={ruleContent}
              onChange={(event) => setRuleContent(event.target.value)}
              placeholder="输入规则、约束、知识说明、标准流程等内容..."
              className="min-h-48 w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-on-surface outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-on-primary disabled:opacity-60"
            >
              保存并向量化规则
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-outline-variant bg-surface-container p-6">
          <div className="flex items-center gap-3">
            <FileUp className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold text-on-surface">上传知识文件</h3>
          </div>
          <form
            className="mt-6 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!selectedFile) return;
              await onUploadFile({
                file: selectedFile,
                title: fileTitle || undefined,
                category: fileCategory || undefined,
              });
              setSelectedFile(null);
              setFileTitle('');
              setFileCategory('Uploaded File');
              const input = document.getElementById('knowledge-file-input') as HTMLInputElement | null;
              if (input) input.value = '';
            }}
          >
            <input
              value={fileTitle}
              onChange={(event) => setFileTitle(event.target.value)}
              placeholder="可选标题，不填则使用文件名"
              className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-on-surface outline-none focus:border-primary"
            />
            <input
              value={fileCategory}
              onChange={(event) => setFileCategory(event.target.value)}
              placeholder="分类，例如 Case Law / Policy / Rules"
              className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-on-surface outline-none focus:border-primary"
            />
            <input
              id="knowledge-file-input"
              type="file"
              accept=".txt,.md,.markdown,.rules,.rule,.csv,.tsv,.yaml,.yml,.json,.xml,.html,.htm,.log"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              className="block w-full rounded-2xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-5 text-sm text-secondary"
            />
            <p className="text-sm text-secondary">
              支持 `txt/md/json/yaml/csv/html/log/rules` 等文本类文件，上传后会自动解析并切块入库。
            </p>
            <button
              type="submit"
              disabled={isSubmitting || !selectedFile}
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-on-primary disabled:opacity-60"
            >
              上传并建立向量索引
            </button>
          </form>
        </section>
      </div>

      <section className="rounded-3xl border border-outline-variant bg-surface-container p-6">
        <div className="flex items-center gap-3">
          <FileSearch className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-bold text-on-surface">语义检索</h3>
        </div>
        <form
          className="mt-6 flex flex-col md:flex-row gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            await onSearch(query);
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="例如：cross examination 的评分规则是什么？"
              className="w-full rounded-2xl border border-outline-variant bg-surface-container-low py-3 pl-11 pr-4 text-on-surface outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-on-primary disabled:opacity-60"
          >
            检索知识库
          </button>
        </form>

        {searchResult ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-secondary">
              查询 “{searchResult.query}” 命中 {searchResult.total} 条结果
            </p>
            {searchResult.results.map((result) => (
              <article key={result.id} className="rounded-2xl border border-outline-variant bg-surface-container-low p-5">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-black text-primary">{result.documentTitle}</span>
                  <span className="text-secondary">{result.category}</span>
                  <span className="rounded-full border border-outline-variant px-2 py-1 text-secondary">
                    {result.sourceType === 'rule' ? '规则' : '文件'}
                  </span>
                  <span className="text-secondary">score {result.score}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-on-surface">{result.excerpt}</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {documents.map((document) => (
          <article key={document.id} className="rounded-3xl border border-outline-variant bg-surface-container p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-bold text-on-surface">{document.title}</p>
                <p className="mt-1 text-sm text-secondary">{document.category}</p>
              </div>
              <span className="rounded-full border border-outline-variant px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                {document.sourceType === 'rule' ? 'Rule' : 'File'}
              </span>
            </div>

            <p className="mt-4 text-sm leading-6 text-secondary">{document.summary}</p>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">状态</span>
                <span className="font-bold text-on-surface">{document.status}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">Chunk 数</span>
                <span className="font-bold text-on-surface">{document.chunkCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">词数</span>
                <span className="font-bold text-on-surface">{document.wordCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">创建时间</span>
                <span className="font-bold text-on-surface">
                  {new Date(document.createdAt).toLocaleString()}
                </span>
              </div>
              {document.fileName ? (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-secondary">文件</span>
                  <span className="font-bold text-on-surface truncate">{document.fileName}</span>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">{label}</p>
      <p className="mt-3 text-3xl font-black text-on-surface">{value}</p>
    </div>
  );
}
