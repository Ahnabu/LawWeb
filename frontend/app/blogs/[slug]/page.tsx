"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Footer } from "../../../components/Footer";
import { Navbar } from "../../../components/Navbar";
import { WhatsAppCta } from "../../../components/WhatsAppCta";
import { API_BASE_URL } from "../../../lib/api";
import { useLanguage } from "../../../components/LanguageProvider";
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
  const { localePath } = useLanguage();
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
      <div className="mx-auto max-w-176 animate-pulse space-y-6 px-4 py-16 sm:px-6">
        <div className="h-8 w-2/3 rounded bg-surface-container" />
        <div className="h-4 w-1/3 rounded bg-surface-container" />
        <div className="h-64 rounded-xl bg-surface-container" />
        {[0,1,2].map(i => <div key={i} className="h-4 w-full rounded bg-surface-container" />)}
      </div>
    </main>
  );

  if (error || !blog) return (
    <main className="flex min-h-screen flex-col bg-surface">
      <Navbar />
      <div className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="space-y-3 text-center">
          <Newspaper aria-hidden="true" className="mx-auto h-10 w-10 text-outline" />
          <p className="text-lg font-semibold text-on-surface">Article not found</p>
          <p className="text-sm text-on-surface-variant">{error ?? "This article may have been removed."}</p>
          <Link href={localePath("/blogs")} className="btn btn-secondary mt-3">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to Blog
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );

  return (
    <main className="flex min-h-screen flex-col bg-surface">
      <Navbar />

      {/* Title band */}
      <header className="page-hero px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-176">
          <Link href={localePath("/blogs")} className="inline-flex min-h-8 items-center gap-1.5 text-sm text-white/75 transition-colors hover:text-white">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> All Articles
          </Link>
          <p className="mt-6 text-sm font-semibold capitalize text-secondary">{blog.category.replace(/-/g, " ")}</p>
          <h1 className="mt-2 text-white">{blog.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/75">
            <span className="flex items-center gap-1.5"><User aria-hidden="true" className="h-3.5 w-3.5" /> {blog.authorName}</span>
            <span className="flex items-center gap-1.5"><Calendar aria-hidden="true" className="h-3.5 w-3.5" /> {fmt(blog.publishedAt ?? blog.createdAt)}</span>
            <span className="flex items-center gap-1.5"><Clock aria-hidden="true" className="h-3.5 w-3.5" /> {blog.readingTimeMinutes} min read</span>
          </div>
        </div>
      </header>

      {/* Article content */}
      <article className="mx-auto w-full max-w-176 px-4 py-10 sm:px-6 sm:py-14">
        {blog.coverImageUrl && (
          <div className="card relative mb-10 aspect-video w-full overflow-hidden">
            <Image
              src={blog.coverImageUrl}
              alt={blog.title}
              fill
              sizes="(max-width: 768px) 100vw, 704px"
              className="object-cover"
            />
          </div>
        )}

        {/* Excerpt */}
        <p className="mb-8 text-lg leading-8 text-on-surface">{blog.excerpt}</p>
        <hr className="rule mb-8" />

        {/* Blocks */}
        <div className="space-y-5">
          {blog.blocks.map((block, i) => <BlockRenderer key={i} block={block} />)}
        </div>

        {/* Tags */}
        {blog.tags.length > 0 && (
          <div className="mt-12">
            <p className="mb-3 text-sm font-semibold text-on-surface">Tags</p>
            <div className="flex flex-wrap gap-2">
              {blog.tags.map(t => (
                <span key={t} className="chip">
                  <Tag aria-hidden="true" className="h-3 w-3" /> {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Back CTA */}
        <div className="panel mt-12 flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-sm font-semibold text-on-surface">Read more articles</p>
            <p className="mt-0.5 text-sm text-on-surface-variant">Explore our full collection of legal insights and news.</p>
          </div>
          <Link href={localePath("/blogs")} className="btn btn-secondary shrink-0">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to Blog
          </Link>
        </div>
      </article>

      <Footer />
      <WhatsAppCta />
    </main>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "h1":
      return <h2 className="pt-4 text-2xl leading-tight text-heading sm:text-[1.75rem]">{block.content}</h2>;
    case "h2":
      return <h3 className="pt-3 text-xl leading-tight text-heading sm:text-2xl">{block.content}</h3>;
    case "h3":
      return <h4 className="pt-2 text-lg leading-snug text-heading">{block.content}</h4>;
    case "paragraph":
      return <p className="text-[1.0625rem] leading-8 text-on-surface">{block.content}</p>;
    case "quote":
      return (
        <blockquote className="border-l-2 border-secondary py-1 pl-5">
          <p className="font-display text-lg italic leading-8 text-on-surface">{block.content}</p>
        </blockquote>
      );
    case "callout":
      return (
        <div className="notice notice-info border-l-2 border-l-secondary">
          <p className="text-[0.9375rem] leading-7">{block.content}</p>
        </div>
      );
    case "divider":
      return <hr className="rule my-4" />;
    case "list":
      return (
        <ul className="list-disc space-y-2 pl-6 text-[1.0625rem] leading-8 text-on-surface marker:text-secondary">
          {(block.items ?? []).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}
