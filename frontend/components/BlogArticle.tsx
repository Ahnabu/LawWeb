"use client";

import Image from "next/image";
import Link from "next/link";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { WhatsAppCta } from "./WhatsAppCta";
import { useLanguage } from "./LanguageProvider";
import type { BlogBlock, BlogPost } from "../lib/blogs";
import { Clock, Tag, ArrowLeft, Calendar, User } from "lucide-react";

// Article view for /blogs/[slug] and /bn/blogs/[slug]; the page fetches the
// article on the server and passes it in.
export function BlogArticle({ blog }: { blog: BlogPost }) {
  const { localePath } = useLanguage();

  // Fixed time zone: the server and the browser must print the same date
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" });

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

function BlockRenderer({ block }: { block: BlogBlock }) {
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
