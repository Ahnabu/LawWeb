"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, Languages, Pencil, Settings } from "lucide-react";
import { contentRegistry } from "../../../../lib/contentRegistry";
import { banglaStatus, getAdminContentPages, type AdminContentPage } from "../../../../lib/adminContent";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function AdminContentPage() {
  const [pages, setPages] = useState<AdminContentPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminContentPages()
      .then(setPages)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load content pages"))
      .finally(() => setLoading(false));
  }, []);

  const byKey = new Map(pages.map((p) => [p.key, p]));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">Website Content</h3>
        <p className="text-sm text-on-surface-variant">
          Edit the text and lists on public pages in English and Bangla. Changes are saved as a draft and go live when you publish.
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl border border-outline-variant bg-surface-container" />)}</div>
      ) : error ? (
        <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">{error}</div>
      ) : (
        <div className="space-y-3">
          {contentRegistry.map((def) => {
            const page = byKey.get(def.key);
            const bangla = banglaStatus(def, page?.draft ?? {});
            return (
              <div key={def.key} className="rounded-xl border border-outline-variant bg-surface-container p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                      {def.key === "site" ? <Settings className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-on-surface">{def.title}</p>
                        <PublishBadge page={page} />
                        {page?.hasUnpublishedChanges && (
                          <span className="rounded-full bg-yellow-500/15 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">Unpublished changes</span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant">{def.description}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
                        <span className={`flex items-center gap-1 ${bangla.missing || bangla.outdated ? "font-semibold text-orange-600" : ""}`}>
                          <Languages className="h-3.5 w-3.5" />
                          Bangla {bangla.percent}%
                          {bangla.missing > 0 && ` · ${bangla.missing} missing`}
                          {bangla.outdated > 0 && ` · ${bangla.outdated} outdated`}
                        </span>
                        {page?.publishedAt && <span>Published {formatDate(page.publishedAt)}{page.publishedByName && ` by ${page.publishedByName}`}</span>}
                        {page?.hasUnpublishedChanges && page.draftUpdatedAt && (
                          <span>Draft saved {formatDate(page.draftUpdatedAt)}{page.draftUpdatedByName && ` by ${page.draftUpdatedByName}`}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link href={`/dashboard/admin/content/${def.key}`}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-secondary/60 bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary hover:text-primary transition">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PublishBadge({ page }: { page: AdminContentPage | undefined }) {
  if (!page || page.version === 0) {
    return <span className="rounded-full bg-outline/20 px-2.5 py-0.5 text-xs font-semibold text-on-surface-variant">Default content</span>;
  }
  return <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-700">Published v{page.version}</span>;
}
