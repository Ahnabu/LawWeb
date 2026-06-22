"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Footer } from "../../../components/Footer";
import { Navbar } from "../../../components/Navbar";
import { WhatsAppCta } from "../../../components/WhatsAppCta";
import { API_BASE_URL } from "../../../lib/api";
import { Clock, Tag, ArrowLeft, Calendar, User, Newspaper } from "lucide-react";

interface Block {
  type: "h1" | "h2" | "h3" | "paragraph" | "quote" | "callout" | "divider" | "list";
  content?: string;
  items?: string[];
}

interface Blog {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  blocks: Block[];
  authorName: string;
  readingTimeMinutes: number;
  publishedAt?: string;
  createdAt: string;
  coverImageUrl?: string;
}

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const fetchBlog = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/blogs/slug/${slug}`);
        if (!r.ok) throw new Error("Blog not found");
        const d = await r.json();
        setBlog(d.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error loading blog");
      } finally {
        setLoading(false);
      }
    };
    void fetchBlog();
  }, [slug]);

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  if (loading) return (
    <main className="min-h-screen bg-surface">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 space-y-6 animate-pulse mt-14 sm:mt-17">
        <div className="h-64 rounded-2xl bg-surface-container" />
        <div className="h-8 w-2/3 rounded bg-surface-container" />
        <div className="h-4 w-1/3 rounded bg-surface-container" />
        {[0,1,2].map(i => <div key={i} className="h-4 w-full rounded bg-surface-container" />)}
      </div>
    </main>
  );

  if (error || !blog) return (
    <main className="min-h-screen bg-surface flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center mt-14 sm:mt-17">
        <div className="text-center space-y-4">
          <Newspaper className="mx-auto h-14 w-14 text-on-surface-variant" />
          <p className="text-lg font-semibold text-on-surface">Article not found</p>
          <p className="text-sm text-on-surface-variant">{error ?? "This article may have been removed."}</p>
          <Link href="/blogs" className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 transition">
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );

  return (
    <main className="min-h-screen bg-surface flex flex-col">
      <Navbar />
      
      {/* Hero / Cover */}
      {blog.coverImageUrl ? (
        <div className="relative h-72 sm:h-96 w-full overflow-hidden mt-14 sm:mt-17">
          <Image
            src={blog.coverImageUrl}
            alt={blog.title}
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 sm:px-8">
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize text-primary">
              {blog.category.replace(/-/g, " ")}
            </span>
            <h1 className="font-display mt-3 text-3xl font-bold text-white sm:text-4xl leading-tight">
              {blog.title}
            </h1>
          </div>
        </div>
      ) : (
        <div className="bg-hero-pattern py-20 px-4 text-center mt-14 sm:mt-17">
          <span className="rounded-full bg-secondary/20 px-3 py-1 text-xs font-semibold capitalize text-secondary">
            {blog.category.replace(/-/g, " ")}
          </span>
          <h1 className="font-display mt-4 text-3xl font-bold text-white sm:text-4xl">{blog.title}</h1>
        </div>
      )}

      {/* Article content */}
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link href="/blogs" className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-secondary transition mb-8">
          <ArrowLeft className="h-4 w-4" /> All Articles
        </Link>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant mb-8 pb-6 border-b border-outline-variant">
          <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {blog.authorName}</span>
          <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {fmt(blog.publishedAt ?? blog.createdAt)}</span>
          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {blog.readingTimeMinutes} min read</span>
        </div>

        {/* Excerpt */}
        <p className="text-base text-on-surface-variant leading-relaxed mb-8 italic border-l-4 border-secondary pl-4">
          {blog.excerpt}
        </p>

        {/* Blocks */}
        <div className="space-y-5">
          {blog.blocks.map((block, i) => <BlockRenderer key={i} block={block} />)}
        </div>

        {/* Tags */}
        {blog.tags.length > 0 && (
          <div className="mt-10 pt-6 border-t border-outline-variant">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-3">Tags</p>
            <div className="flex flex-wrap gap-2">
              {blog.tags.map(t => (
                <span key={t} className="flex items-center gap-1 rounded-full border border-outline-variant px-3 py-1 text-xs text-on-surface-variant hover:border-secondary hover:text-secondary transition cursor-default">
                  <Tag className="h-3 w-3" /> {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Back CTA */}
        <div className="mt-12 rounded-2xl border border-outline-variant bg-surface-container p-6 text-center">
          <p className="text-sm font-semibold text-on-surface mb-1">Read more articles</p>
          <p className="text-xs text-on-surface-variant mb-4">Explore our full collection of legal insights and news.</p>
          <Link href="/blogs" className="inline-flex items-center gap-2 rounded-lg bg-secondary px-5 py-2.5 text-sm font-semibold text-primary hover:opacity-90 transition">
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>
        </div>
      </div>
      
      <Footer />
      <WhatsAppCta />
    </main>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "h1":
      return <h2 className="font-display text-3xl font-bold text-on-surface leading-tight">{block.content}</h2>;
    case "h2":
      return <h3 className="font-display text-2xl font-bold text-on-surface leading-tight">{block.content}</h3>;
    case "h3":
      return <h4 className="font-display text-xl font-semibold text-on-surface leading-snug">{block.content}</h4>;
    case "paragraph":
      return <p className="text-base text-on-surface-variant leading-relaxed">{block.content}</p>;
    case "quote":
      return (
        <blockquote className="border-l-4 border-secondary pl-5 py-1">
          <p className="text-base italic text-on-surface-variant leading-relaxed">{block.content}</p>
        </blockquote>
      );
    case "callout":
      return (
        <div className="rounded-xl border border-secondary/30 bg-secondary/5 px-5 py-4">
          <p className="text-sm font-medium text-on-surface leading-relaxed">💡 {block.content}</p>
        </div>
      );
    case "divider":
      return <hr className="border-outline-variant my-2" />;
    case "list":
      return (
        <ul className="space-y-2 pl-1">
          {(block.items ?? []).map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-base text-on-surface-variant">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
              {item}
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}
