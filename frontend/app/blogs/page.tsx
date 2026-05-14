"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Footer } from "../../components/Footer";
import { Navbar } from "../../components/Navbar";
import { WhatsAppCta } from "../../components/WhatsAppCta";
import { API_BASE_URL } from "../../lib/api";
import { Clock, Tag, ArrowRight, Newspaper, Search } from "lucide-react";

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

const CATEGORIES = [
  "all","immigration","criminal-law","civil-law","corporate-law","family-law",
  "real-estate","banking-finance","labor-law","tax-law","legal-tips","news","other",
];

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [filtered, setFiltered] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/blogs?status=published`);
        if (!r.ok) throw new Error("Failed to load blogs");
        const d = await r.json();
        setBlogs(d.data ?? []);
        setFiltered(d.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error loading blogs");
      } finally {
        setLoading(false);
      }
    };
    void fetchBlogs();
  }, []);

  useEffect(() => {
    let result = blogs;
    if (category !== "all") result = result.filter(b => b.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.excerpt.toLowerCase().includes(q) ||
        b.tags.some(t => t.includes(q))
      );
    }
    setFiltered(result);
  }, [category, search, blogs]);

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="min-h-screen bg-surface">
      <Navbar />
      {/* Hero */}
      <section className="bg-hero-pattern py-20 text-center px-4 mt-14 sm:mt-17">
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-3">Our Blog</p>
        <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">Legal Insights &amp; News</h1>
        <p className="mt-4 text-base text-white/70 max-w-xl mx-auto">
          Stay informed with expert articles on immigration, corporate law, legal tips and more.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
        {/* Search + filter bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search articles…"
              className="w-full rounded-xl border border-outline-variant bg-surface-container pl-9 pr-4 py-2.5 text-sm text-on-surface outline-none focus:border-secondary"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                  category === c
                    ? "bg-primary text-on-primary"
                    : "border border-outline-variant text-on-surface-variant hover:border-secondary hover:text-secondary"
                }`}
              >
                {c === "all" ? "All" : c.replace(/-/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {/* States */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0,1,2,3,4,5].map(i => (
              <div key={i} className="animate-pulse rounded-2xl border border-outline-variant bg-surface-container">
                <div className="h-44 rounded-t-2xl bg-surface-container-high" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-1/3 rounded bg-surface-container-high" />
                  <div className="h-5 w-4/5 rounded bg-surface-container-high" />
                  <div className="h-4 w-full rounded bg-surface-container-high" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-error/30 bg-error/10 p-6 text-center text-sm text-error">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Newspaper className="mx-auto mb-4 h-12 w-12 text-on-surface-variant" />
            <p className="text-on-surface-variant">No articles found. Check back soon!</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-on-surface-variant">{filtered.length} article{filtered.length !== 1 ? "s" : ""}</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(blog => (
                <article key={blog._id} className="group flex flex-col rounded-2xl border border-outline-variant bg-surface-container overflow-hidden hover:shadow-lg hover:border-secondary/40 transition-all duration-300">
                  {/* Cover */}
                  {blog.coverImageUrl ? (
                    <img src={blog.coverImageUrl} alt={blog.title} className="h-44 w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="h-44 w-full bg-primary/5 flex items-center justify-center">
                      <Newspaper className="h-10 w-10 text-primary/20" />
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-5 space-y-3">
                    {/* Category + read time */}
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-semibold capitalize text-secondary">
                        {blog.category.replace(/-/g, " ")}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                        <Clock className="h-3 w-3" /> {blog.readingTimeMinutes} min
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="font-display text-base font-semibold text-on-surface line-clamp-2 group-hover:text-secondary transition-colors">
                      {blog.title}
                    </h2>

                    {/* Excerpt */}
                    <p className="flex-1 text-sm text-on-surface-variant line-clamp-3">{blog.excerpt}</p>

                    {/* Tags */}
                    {blog.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {blog.tags.slice(0, 3).map(t => (
                          <span key={t} className="flex items-center gap-1 rounded-full border border-outline-variant px-2 py-0.5 text-xs text-on-surface-variant">
                            <Tag className="h-2.5 w-2.5" /> {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
                      <div>
                        {/* <p className="text-xs font-medium text-on-surface">{blog.authorName}</p> */}
                        <p className="text-xs text-on-surface-variant">{fmt(blog.publishedAt ?? blog.createdAt)}</p>
                      </div>
                      <Link
                        href={`/blogs/${blog.slug}`}
                        className="flex items-center gap-1.5 rounded-lg bg-secondary/10 border border-secondary/30 px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary hover:text-on-primary transition"
                      >
                        Read More <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
      <Footer />
      <WhatsAppCta />
    </main>
  );
}
