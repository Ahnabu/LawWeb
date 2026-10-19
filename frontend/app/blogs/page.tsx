"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Footer } from "../../components/Footer";
import { Navbar } from "../../components/Navbar";
import { WhatsAppCta } from "../../components/WhatsAppCta";
import { API_BASE_URL } from "../../lib/api";
import { useLanguage } from "../../components/LanguageProvider";
import { Clock, ArrowRight, Newspaper, Search } from "lucide-react";

interface Blog {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  authorName: string;
  readingTimeMinutes: number;
  publishedAt?: string;
  createdAt: string;
  coverImageUrl?: string;
}

const PAGE_SIZE = 12;

const CATEGORIES = [
  "all","immigration","criminal-law","civil-law","corporate-law","family-law",
  "real-estate","banking-finance","labor-law","tax-law","legal-tips","news","other",
];

export default function BlogsPage() {
  const { t, locale, localePath } = useLanguage();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  // Ignores responses that arrive after the filters changed again
  const requestId = useRef(0);

  // Debounce the search box so typing does not fire a request per keystroke;
  // a new search starts again from the first page
  useEffect(() => {
    const next = search.trim();
    if (next === query) return;
    const handle = window.setTimeout(() => {
      setQuery(next);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search, query]);

  // Filtering happens on the server, so it covers every post, not just the loaded ones.
  // Page 1 replaces the list; later pages ("Load more") append to it.
  useEffect(() => {
    const id = ++requestId.current;
    if (page === 1) setLoading(true);
    else setLoadingMore(true);
    setError(false);
    const params = new URLSearchParams({ status: "published", page: String(page), limit: String(PAGE_SIZE) });
    if (category !== "all") params.set("category", category);
    if (query) params.set("search", query);
    fetch(`${API_BASE_URL}/api/blogs?${params}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load blogs");
        const d = await r.json();
        if (id !== requestId.current) return;
        const rows: Blog[] = d.data ?? [];
        setBlogs((prev) => (page === 1 ? rows : [...prev, ...rows.filter((b) => !prev.some((p) => p._id === b._id))]));
        setTotal(d.meta?.total ?? rows.length);
      })
      .catch(() => {
        if (id === requestId.current) setError(true);
      })
      .finally(() => {
        if (id !== requestId.current) return;
        setLoading(false);
        setLoadingMore(false);
      });
  }, [category, query, page]);

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="min-h-screen bg-surface">
      <Navbar />
      {/* Hero */}
      <section className="page-hero px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold text-secondary">{t("blogsPage.label")}</p>
          <h1 className="mt-3 max-w-3xl text-white">{t("blogsPage.title")}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">{t("blogsPage.subtitle")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {/* Search + filter bar */}
        <div className="space-y-4">
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">{t("blogsPage.searchPlaceholder")}</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("blogsPage.searchPlaceholder")}
              className="field pl-9"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => {
                  setCategory(c);
                  setPage(1);
                }}
                className="chip capitalize"
              >
                {t(`blogsPage.categories.${c}`)}
              </button>
            ))}
          </div>
        </div>

        {/* States */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0,1,2,3,4,5].map(i => (
              <div key={i} className="card animate-pulse overflow-hidden">
                <div className="h-44 bg-surface-container" />
                <div className="space-y-3 p-5">
                  <div className="h-4 w-1/3 rounded bg-surface-container-high" />
                  <div className="h-5 w-4/5 rounded bg-surface-container-high" />
                  <div className="h-4 w-full rounded bg-surface-container-high" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="notice notice-error text-center">{t("blogsPage.loadError")}</div>
        ) : blogs.length === 0 ? (
          <div className="py-16 text-center">
            <Newspaper aria-hidden="true" className="mx-auto mb-4 h-10 w-10 text-outline" />
            <p className="text-on-surface-variant">{t("blogsPage.noArticles")}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-on-surface-variant">{total} {t(total === 1 ? "blogsPage.article" : "blogsPage.articles")}</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {blogs.map(blog => (
                <article key={blog._id} className="card card-interactive flex flex-col overflow-hidden">
                  {/* Cover */}
                  {blog.coverImageUrl ? (
                    <div className="relative h-44 w-full overflow-hidden border-b border-outline-variant">
                      <Image
                        src={blog.coverImageUrl}
                        alt={blog.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-44 w-full items-center justify-center border-b border-outline-variant bg-surface-container">
                      <Newspaper aria-hidden="true" className="h-8 w-8 text-outline" />
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-5">
                    {/* Category + read time */}
                    <div className="flex items-center justify-between gap-3 text-xs text-on-surface-variant">
                      <span className="font-semibold capitalize text-gold-ink">
                        {t(`blogsPage.categories.${blog.category}`)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock aria-hidden="true" className="h-3 w-3" /> {blog.readingTimeMinutes} {t("blogsPage.minRead")}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="mt-3 line-clamp-2 text-lg leading-snug text-heading">{blog.title}</h2>

                    {/* Excerpt */}
                    <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-on-surface-variant">{blog.excerpt}</p>

                    {/* Tags */}
                    {blog.tags.length > 0 && (
                      <p className="mt-3 text-xs text-on-surface-variant">
                        {blog.tags.slice(0, 3).map(tag => `#${tag}`).join("  ")}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-outline-variant pt-4">
                      <p className="text-xs text-on-surface-variant">{fmt(blog.publishedAt ?? blog.createdAt)}</p>
                      <Link
                        href={localePath(`/blogs/${blog.slug}`)}
                        className="text-link inline-flex min-h-8 items-center gap-1 text-sm"
                      >
                        {t("blogsPage.readMore")} <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {blogs.length < total && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loadingMore}
                  className="btn btn-secondary"
                >
                  {loadingMore ? t("blogsPage.loadingMore") : t("blogsPage.loadMore")}
                </button>
              </div>
            )}
          </>
        )}
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  );
}
