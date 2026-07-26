import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, X, Users, FileText, Loader2, UserRound } from 'lucide-react';
import api from '../../lib/axios';
import { DEFAULT_IMAGES } from '../../constants/defaultImages';
import { cn } from '../../lib/utils';
import ProfileLink from '../Profile/ProfileLink';

interface SearchPerson {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  isFriend?: boolean;
}

interface SearchPost {
  id: string;
  content: string;
  createdAt?: string | null;
  hasMedia?: boolean;
  author: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
}

interface SearchResponse {
  query: string;
  people: SearchPerson[];
  posts: SearchPost[];
}

type FlatItem =
  | { type: 'person'; data: SearchPerson }
  | { type: 'post'; data: SearchPost };

const DEBOUNCE_MS = 280;
const MIN_CHARS = 2;

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const q = query.trim();
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent/25 text-foreground rounded-sm px-0.5 font-medium">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

const HeaderSearch: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const people = results?.people || [];
  const posts = results?.posts || [];
  const flatItems: FlatItem[] = [
    ...people.map((data) => ({ type: 'person' as const, data })),
    ...posts.map((data) => ({ type: 'post' as const, data })),
  ];

  const hasQuery = query.trim().length >= MIN_CHARS;
  const showPanel = open && (hasQuery || loading || !!error);

  const closeAll = useCallback(() => {
    setOpen(false);
    setMobileOpen(false);
  }, []);

  const runSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < MIN_CHARS) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get<SearchResponse>('/search', {
        params: { q: trimmed },
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setResults(data);
        setActiveIndex(-1);
      }
    } catch (err: unknown) {
      const isAbort =
        (err as { name?: string; code?: string })?.name === 'CanceledError' ||
        (err as { code?: string })?.code === 'ERR_CANCELED';
      if (!isAbort) {
        console.error('Search failed:', err);
        setError(t('search.failed'));
        setResults({ query: trimmed, people: [], posts: [] });
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, open, runSearch]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        if (!mobileOpen) setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [mobileOpen]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [mobileOpen]);

  const goToItem = (item: FlatItem) => {
    closeAll();
    setQuery('');
    setResults(null);
    if (item.type === 'person') {
      const username = item.data.username;
      navigate(username ? `/profile/${username}` : `/profile/${item.data.id}`);
    } else {
      const username = item.data.author.username;
      navigate(username ? `/profile/${username}` : '/home', {
        state: { highlightPostId: item.data.id },
      });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeAll();
      inputRef.current?.blur();
      return;
    }
    if (!showPanel || flatItems.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? flatItems.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      goToItem(flatItems[activeIndex]);
    }
  };

  const clearQuery = () => {
    setQuery('');
    setResults(null);
    setError(null);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const empty = hasQuery && !loading && !error && people.length === 0 && posts.length === 0;

  const resultsPanel = showPanel && (
    <div
      id={`${inputId}-listbox`}
      role="listbox"
      className={cn(
        'z-[60] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-xl backdrop-blur-xl',
        mobileOpen ? 'relative mt-3' : 'absolute left-0 right-0 top-[calc(100%+6px)]',
      )}
    >
      <div className={cn('overflow-y-auto scrollbar-hide', mobileOpen ? 'max-h-[70dvh]' : 'max-h-[min(70vh,420px)]')}>
        {loading && !results && (
          <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted">
            <Loader2 size={16} className="animate-spin text-accent" />
            {t('search.searching')}
          </div>
        )}

        {error && <p className="px-4 py-6 text-center text-sm text-red-400">{error}</p>}

        {empty && (
          <div className="px-4 py-8 text-center">
            <Search size={22} className="mx-auto mb-2 text-muted/60" />
            <p className="text-sm font-medium text-foreground">{t('search.noResults')}</p>
            <p className="mt-1 text-xs text-muted">{t('search.tryDifferent')}</p>
          </div>
        )}

        {people.length > 0 && (
          <section className="border-b border-border/60">
            <div className="sticky top-0 z-[1] flex items-center gap-1.5 bg-card/95 px-3 py-2 backdrop-blur-md">
              <Users size={13} className="text-accent" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t('search.people')}
              </span>
            </div>
            <ul className="pb-1">
              {people.map((person, i) => {
                const active = activeIndex === i;
                return (
                  <li key={person.id} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => goToItem({ type: 'person', data: person })}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                        active ? 'bg-accent/15' : 'hover:bg-card-hover',
                      )}
                    >
                      <img
                        src={person.avatar || DEFAULT_IMAGES.avatar}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_IMAGES.avatar;
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {highlightMatch(person.name, query)}
                          </p>
                          {person.isFriend && (
                            <span className="shrink-0 rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                              {t('search.friend')}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted">
                          @{highlightMatch(person.username, query)}
                          {person.bio ? ` · ${person.bio}` : ''}
                        </p>
                      </div>
                      <UserRound size={14} className="shrink-0 text-muted/50" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {posts.length > 0 && (
          <section>
            <div className="sticky top-0 z-[1] flex items-center gap-1.5 bg-card/95 px-3 py-2 backdrop-blur-md">
              <FileText size={13} className="text-accent" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t('search.posts')}
              </span>
            </div>
            <ul className="pb-1">
              {posts.map((post, i) => {
                const flatIdx = people.length + i;
                const active = activeIndex === flatIdx;
                return (
                  <li key={post.id} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(flatIdx)}
                      onClick={() => goToItem({ type: 'post', data: post })}
                      className={cn(
                        'flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors',
                        active ? 'bg-accent/15' : 'hover:bg-card-hover',
                      )}
                    >
                      <img
                        src={post.author.avatar || DEFAULT_IMAGES.avatar}
                        alt=""
                        className="mt-0.5 h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_IMAGES.avatar;
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-muted">
                          <ProfileLink
                            username={post.author.username}
                            className="font-medium text-foreground/90 inline"
                          >
                            {post.author.name}
                          </ProfileLink>
                          {post.author.username ? (
                            <>
                              {' · '}
                              <ProfileLink username={post.author.username} className="inline">
                                @{post.author.username}
                              </ProfileLink>
                            </>
                          ) : null}
                          {post.hasMedia ? ` · ${t('search.withMedia')}` : ''}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-foreground/90">
                          {highlightMatch(post.content, query)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      {hasQuery && (people.length > 0 || posts.length > 0) && (
        <div className="border-t border-border/60 px-3 py-2 text-[11px] text-muted">
          {t('search.hint')}
        </div>
      )}
    </div>
  );

  const field = (
    <div
      className={cn(
        'group flex h-10 items-center gap-2 rounded-full border bg-background-secondary/80 px-3 transition-all',
        open
          ? 'border-accent/50 shadow-[0_0_0_3px_rgb(var(--accent)/0.12)]'
          : 'border-border/70 hover:border-border',
      )}
    >
      <Search
        size={16}
        className={cn('shrink-0 transition-colors', open || query ? 'text-accent' : 'text-muted')}
        aria-hidden
      />
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        autoComplete="off"
        spellCheck={false}
        value={query}
        placeholder={t('search.placeholder')}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={!!showPanel}
        aria-controls={`${inputId}-listbox`}
        aria-autocomplete="list"
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted/70 outline-none"
      />
      {loading && <Loader2 size={14} className="shrink-0 animate-spin text-muted" />}
      {query && !loading && (
        <button
          type="button"
          onClick={clearQuery}
          className="rounded-full p-0.5 text-muted hover:bg-card-hover hover:text-foreground"
          aria-label={t('search.clear')}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop / tablet bar */}
      <div ref={!mobileOpen ? rootRef : undefined} className="relative hidden sm:block w-full max-w-xl mx-auto px-2 lg:px-6">
        <label htmlFor={inputId} className="sr-only">
          {t('search.placeholder')}
        </label>
        {!mobileOpen && (
          <>
            {field}
            {resultsPanel}
          </>
        )}
      </div>

      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => {
          setMobileOpen(true);
          setOpen(true);
        }}
        className="sm:hidden p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-card-hover transition-colors"
        aria-label={t('search.placeholder')}
      >
        <Search size={18} />
      </button>

      {mobileOpen &&
        createPortal(
          <div className="sm:hidden fixed inset-0 z-[100] bg-background flex flex-col">
            <div
              ref={rootRef}
              className="px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-border"
            >
              <div className="flex items-center gap-2 mb-0">
                <button
                  type="button"
                  onClick={() => {
                    closeAll();
                    setQuery('');
                    setResults(null);
                  }}
                  className="shrink-0 p-2 rounded-full text-muted hover:text-foreground hover:bg-card-hover"
                  aria-label={t('common.cancel')}
                >
                  <X size={20} />
                </button>
                <div className="flex-1 min-w-0">
                  <label htmlFor={inputId} className="sr-only">
                    {t('search.placeholder')}
                  </label>
                  {field}
                </div>
              </div>
              {resultsPanel}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default HeaderSearch;
