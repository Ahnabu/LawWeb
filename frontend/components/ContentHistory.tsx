"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GitCompare, Loader2, RotateCcw } from "lucide-react";
import type { PageContent } from "../lib/content";
import type { ContentPageDef } from "../lib/contentRegistry";
import {
  diffPageData,
  getContentRevision,
  getContentRevisions,
  restoreContentRevision,
  type AdminContentPage,
  type ContentRevisionSummary,
} from "../lib/adminContent";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// ── Version history ───────────────────────────────────────────────────────────
// Every publish is kept as a revision (the newest 20). Compare lists what
// differs from the editor's current state; Restore copies a revision into the
// draft, which the admin then reviews and publishes.
export function ContentHistory({ def, page, current, dirty, onRestored }: {
  def: ContentPageDef;
  page: AdminContentPage;
  current: PageContent;
  dirty: boolean;
  onRestored: (page: AdminContentPage) => void;
}) {
  const [revisions, setRevisions] = useState<ContentRevisionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compared, setCompared] = useState<{ version: number; data: PageContent } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Reload after each publish (new version)
  useEffect(() => {
    setLoading(true);
    getContentRevisions(def.key)
      .then((list) => { setRevisions(list); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load history"))
      .finally(() => setLoading(false));
  }, [def.key, page.version]);

  const compare = async (version: number) => {
    if (compared?.version === version) return setCompared(null);
    setBusy(`compare-${version}`);
    try {
      const revision = await getContentRevision(def.key, version);
      setCompared({ version, data: revision.data ?? {} });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load version");
    } finally {
      setBusy(null);
    }
  };

  const restore = async (version: number) => {
    const message = dirty
      ? `Restore version ${version} into the draft? Your unsaved edits will be lost. The live site does not change until you publish.`
      : `Restore version ${version} into the draft? The live site does not change until you publish.`;
    if (!confirm(message)) return;
    setBusy(`restore-${version}`);
    try {
      onRestored(await restoreContentRevision(def.key, version));
      setCompared(null);
      toast.success(`Version ${version} restored to the draft. Publish to make it live.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to restore version");
    } finally {
      setBusy(null);
    }
  };

  const changes = compared ? diffPageData(def, compared.data, current) : [];

  return (
    <section className="space-y-3 rounded-xl border border-outline-variant bg-surface-container p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Version history</p>
        <p className="mt-1 text-xs text-on-surface-variant">
          Every publish is saved (the latest 20). Restoring copies a version into the draft; publish it to make it live.
        </p>
      </div>

      {loading ? (
        <div className="h-16 animate-pulse rounded-lg bg-surface" />
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : revisions.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Nothing published yet. Versions appear here after the first publish.</p>
      ) : (
        <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant bg-surface">
          {revisions.map((revision) => (
            <li key={revision._id} className="space-y-2 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-on-surface">Version {revision.version}</span>
                  {revision.version === page.version && (
                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-700">Live</span>
                  )}
                  <span className="text-xs text-on-surface-variant">
                    {formatDateTime(revision.createdAt)}{revision.publishedByName && ` by ${revision.publishedByName}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => compare(revision.version)} disabled={busy !== null}
                    className="flex items-center gap-1.5 rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50 transition">
                    {busy === `compare-${revision.version}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitCompare className="h-3 w-3" />}
                    {compared?.version === revision.version ? "Hide" : "Compare"}
                  </button>
                  <button type="button" onClick={() => restore(revision.version)} disabled={busy !== null}
                    className="flex items-center gap-1.5 rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50 transition">
                    {busy === `restore-${revision.version}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                    Restore
                  </button>
                </div>
              </div>

              {compared?.version === revision.version && (
                <div className="rounded-lg bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
                  {changes.length === 0 ? (
                    <p>Same as the editor&apos;s current content.</p>
                  ) : (
                    <>
                      <p className="font-semibold text-on-surface">
                        {changes.length} {changes.length === 1 ? "difference" : "differences"} from the editor&apos;s current content:
                      </p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-5">
                        {changes.map((change) => <li key={change}>{change}</li>)}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
