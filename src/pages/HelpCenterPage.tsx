import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Home,
  Library,
  Menu,
  Search,
  X,
} from 'lucide-react';
import {
  helpCenterCategories,
  helpCenterHotKeywords,
  type HelpArticle,
  type HelpBlock,
  type HelpCategory,
} from '../data/helpCenterContent';

type NavTarget = 'home' | 'help' | 'cases';

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase('zh-CN');
}

function articleText(article: HelpArticle) {
  const blockText = article.blocks
    .map((block) => {
      if (block.type === 'paragraph' || block.type === 'notice') return block.text;
      if (block.type === 'example') return block.lines.join(' ');
      return block.items.join(' ');
    })
    .join(' ');
  return [article.question, blockText, ...(article.keywords || [])].join(' ');
}

function categoryMatches(category: HelpCategory, query: string) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return category.articles;
  return category.articles.filter((article) => normalizeText(articleText(article)).includes(normalizedQuery));
}

export function HelpCenterPage() {
  const [activeNav, setActiveNav] = useState<NavTarget>('help');
  const [activeCategoryId, setActiveCategoryId] = useState(helpCenterCategories[0]?.id || '');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);

  const activeCategory = helpCenterCategories.find((category) => category.id === activeCategoryId) || helpCenterCategories[0];
  const normalizedQuery = normalizeText(query);

  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return helpCenterCategories
      .map((category) => ({
        category,
        articles: categoryMatches(category, normalizedQuery),
      }))
      .filter((group) => group.articles.length > 0);
  }, [normalizedQuery]);

  const visibleArticles = normalizedQuery ? [] : activeCategory.articles;
  const resultCount = normalizedQuery ? searchResults.reduce((sum, group) => sum + group.articles.length, 0) : visibleArticles.length;

  useEffect(() => {
    if (normalizedQuery) {
      setExpandedIds(searchResults[0]?.articles[0]?.id ? [searchResults[0].articles[0].id] : []);
      return;
    }
    setExpandedIds([]);
  }, [activeCategory.id, normalizedQuery, searchResults]);

  const selectCategory = (categoryId: string) => {
    setActiveCategoryId(categoryId);
    setQuery('');
    setMobileCategoriesOpen(false);
  };

  const toggleArticle = (articleId: string) => {
    setExpandedIds((prev) =>
      prev.includes(articleId) ? [] : [articleId],
    );
  };

  return (
    <div className="min-h-screen bg-[#f7faff] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563eb] text-white shadow-card">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="text-lg font-semibold leading-tight text-slate-950">SKU 业务看板</div>
              <div className="text-xs text-slate-500">单 SKU 经营分析</div>
            </div>
          </div>
          <nav className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 md:flex" aria-label="顶部导航">
            <TopNavButton icon={<Home size={16} />} label="首页" active={activeNav === 'home'} onClick={() => setActiveNav('home')} />
            <TopNavButton icon={<BookOpen size={16} />} label="帮助中心" active={activeNav === 'help'} onClick={() => setActiveNav('help')} />
            <TopNavButton icon={<Library size={16} />} label="案例库" active={activeNav === 'cases'} onClick={() => setActiveNav('cases')} />
          </nav>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 border-t border-slate-100 px-4 py-2 md:hidden" aria-label="移动端顶部导航">
          <TopNavButton icon={<Home size={16} />} label="首页" active={activeNav === 'home'} onClick={() => setActiveNav('home')} />
          <TopNavButton icon={<BookOpen size={16} />} label="帮助中心" active={activeNav === 'help'} onClick={() => setActiveNav('help')} />
          <TopNavButton icon={<Library size={16} />} label="案例库" active={activeNav === 'cases'} onClick={() => setActiveNav('cases')} />
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
        <section className="mb-5 border-b border-slate-200 bg-[#f7faff] pb-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_460px] lg:items-end">
            <div>
              <div className="inline-flex items-center rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                SKU 业务看板
              </div>
              <h1 className="mt-3 text-2xl font-semibold text-slate-950 lg:text-[32px]">先查规则，再反馈异常问题</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                面向外部客服团队的店铺问题处理入口。遇到用户咨询时，先按商品类型和问题分类查询处理规则；不确定、平台无法操作或用户情绪激动时，再按格式反馈群内。
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-card">
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="help-search">
                搜索关键词
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="help-search"
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索退款、物流、老师、卡券、快递..."
                />
                {query ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100"
                    onClick={() => setQuery('')}
                    aria-label="清空搜索"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {helpCenterHotKeywords.map((keyword) => (
                  <button
                    key={keyword}
                    type="button"
                    className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => setQuery(keyword)}
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {activeNav !== 'help' ? (
          <section className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {activeNav === 'home' ? '首页入口已预留，当前版本先完成帮助中心。' : '案例库入口已预留，下一版可补充标准话术案例卡片。'}
          </section>
        ) : null}

        <div className="mb-4 lg:hidden">
          <button
            type="button"
            className="flex h-11 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-card"
            onClick={() => setMobileCategoriesOpen((prev) => !prev)}
          >
            <span className="inline-flex items-center gap-2">
              <Menu size={16} />
              {normalizedQuery ? '全部分类' : activeCategory.navLabel}
            </span>
            <ChevronDown size={16} className={`transition-transform ${mobileCategoriesOpen ? 'rotate-180' : ''}`} />
          </button>
          {mobileCategoriesOpen ? (
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-card">
              {helpCenterCategories.map((category) => (
                <CategoryButton
                  key={category.id}
                  category={category}
                  active={!normalizedQuery && activeCategoryId === category.id}
                  onClick={() => selectCategory(category.id)}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-[86px] border-r border-slate-200 pr-4">
              <div className="px-2 pb-2 text-sm font-semibold text-slate-950">问题分类</div>
              <nav className="space-y-0.5" aria-label="帮助中心分类">
                {helpCenterCategories.map((category) => (
                  <CategoryButton
                    key={category.id}
                    category={category}
                    active={!normalizedQuery && activeCategoryId === category.id}
                    onClick={() => selectCategory(category.id)}
                  />
                ))}
              </nav>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  {normalizedQuery ? `搜索结果：${query}` : activeCategory.title}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {normalizedQuery ? `共找到 ${resultCount} 条相关规则，点击问题查看完整处理口径。` : activeCategory.summary}
                </p>
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
                {normalizedQuery ? '搜索会匹配标题、内容和关键词' : `${visibleArticles.length} 个问题`}
              </div>
            </div>

            {normalizedQuery ? (
              resultCount > 0 ? (
                <div className="space-y-5">
                  {searchResults.map((group) => (
                    <div key={group.category.id}>
                      <div className="mb-2 text-sm font-semibold text-slate-700">{group.category.navLabel}</div>
                      <div className="space-y-3">
                        {group.articles.map((article) => (
                          <ArticleCard
                            key={article.id}
                            article={article}
                            query={query}
                            expanded={expandedIds.includes(article.id)}
                            onToggle={() => toggleArticle(article.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptySearch query={query} />
              )
            ) : (
              <div className="space-y-3">
                {visibleArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    query={query}
                    expanded={expandedIds.includes(article.id)}
                    onToggle={() => toggleArticle(article.id)}
                  />
                ))}
              </div>
            )}

            {!normalizedQuery && activeCategory.id === 'cautions' ? (
              <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-900">
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <AlertTriangle size={16} />
                  处理提醒
                </div>
                不确定的问题不要自行判断，先反馈群内确认。
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}

interface TopNavButtonProps {
  icon: JSX.Element;
  label: string;
  active: boolean;
  onClick: () => void;
}

function TopNavButton({ icon, label, active, onClick }: TopNavButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm transition md:flex-none ${
        active ? 'bg-white font-medium text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'
      }`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

interface CategoryButtonProps {
  category: HelpCategory;
  active: boolean;
  onClick: () => void;
}

function CategoryButton({ category, active, onClick }: CategoryButtonProps) {
  return (
    <button
      type="button"
      className={`flex min-h-10 w-full items-center justify-between rounded-md border-l-2 px-3 py-2 text-left text-sm transition ${
        active
          ? 'border-blue-600 bg-blue-50 font-medium text-blue-700'
          : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950'
      }`}
      onClick={onClick}
    >
      <span>{category.navLabel}</span>
      <span className={`text-xs ${active ? 'text-blue-500' : 'text-slate-400'}`}>{category.articles.length}</span>
    </button>
  );
}

interface ArticleCardProps {
  article: HelpArticle;
  query: string;
  expanded: boolean;
  onToggle: () => void;
}

function ArticleCard({ article, query, expanded, onToggle }: ArticleCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white shadow-card">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition hover:bg-slate-50"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="text-base font-semibold leading-6 text-slate-950">
          <HighlightedText text={article.question} query={query} />
        </span>
        <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500">
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
      </button>
      {expanded ? (
        <div className="border-t border-slate-100 px-4 py-4">
          <div className="space-y-3 text-sm leading-6 text-slate-700">
            {article.blocks.map((block, index) => (
              <HelpBlockView key={`${article.id}-${index}`} block={block} query={query} />
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function HelpBlockView({ block, query }: { block: HelpBlock; query: string }) {
  if (block.type === 'paragraph') {
    return (
      <p>
        <HighlightedText text={block.text} query={query} />
      </p>
    );
  }
  if (block.type === 'bullets') {
    return (
      <ul className="list-disc space-y-1 pl-5">
        {block.items.map((item) => (
          <li key={item}>
            <HighlightedText text={item} query={query} />
          </li>
        ))}
      </ul>
    );
  }
  if (block.type === 'numbered') {
    return (
      <ol className="list-decimal space-y-1 pl-5">
        {block.items.map((item) => (
          <li key={item}>
            <HighlightedText text={item} query={query} />
          </li>
        ))}
      </ol>
    );
  }
  if (block.type === 'example') {
    return (
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 font-medium text-blue-900">
        {block.lines.map((line) => (
          <div key={line}>
            <HighlightedText text={line} query={query} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-orange-900">
      <HighlightedText text={block.text} query={query} />
    </div>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return <>{text}</>;
  const escaped = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLocaleLowerCase('zh-CN') === normalizedQuery.toLocaleLowerCase('zh-CN') ? (
          <mark key={`${part}-${index}`} className="rounded bg-yellow-200 px-0.5 text-slate-950">
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}

function EmptySearch({ query }: { query: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-10 text-center shadow-card">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Search size={20} />
      </div>
      <h3 className="mt-3 text-base font-semibold text-slate-950">没有找到相关规则</h3>
      <p className="mt-1 text-sm text-slate-500">当前没有匹配“{query}”的内容，可以换成退款、物流、老师、卡券等关键词再试。</p>
    </div>
  );
}
