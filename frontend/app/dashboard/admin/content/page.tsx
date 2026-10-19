"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
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
        <div className="card h-80 bg-surface-container" aria-busy="true" />
      ) : error ? (
        <p className="notice notice-error" role="alert">{error}</p>
      ) : (
        <ul className="card divide-y divide-outline-variant overflow-hidden">
          {contentRegistry.map((def) => {
            const page = byKey.get(def.key);
            const bangla = banglaStatus(def, page?.draft ?? {});
            return (
              <li key={def.key} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-on-surface">{def.title}</p>
                        <PublishBadge page={page} />
                        {page?.hasUnpublishedChanges && (
                          <span className="chip"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-secondary" />Unpublished changes</span>
                        )}
                      </div>
                      <p className="text-sm text-on-surface-variant">{def.description}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
                        <span className={bangla.missing || bangla.outdated ? "font-semibold text-gold-ink" : ""}>
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
                    className="btn btn-secondary btn-sm shrink-0">
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PublishBadge({ page }: { page: AdminContentPage | undefined }) {
  if (!page || page.version === 0) {
    return <span className="chip"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-outline" />Default content</span>;
  }
  return <span className="chip"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />Published v{page.version}</span>;
}
