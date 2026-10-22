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
import { confirmDialog } from "./ConfirmDialog";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// ── Version history ───────────────────────────────────────────────────────────
// Every publish is kept as a revision (the newest 20). Compare lists what
// differs from the editor's current state; Restore copies a revision into the
// draft, which the admin then reviews and publishes.
export function ContentHistory({ def, page, current, dirty, canRestore = true, onRestored }: {
  def: ContentPageDef;
  page: AdminContentPage;
  current: PageContent;
  dirty: boolean;
  // Restoring needs content.publish; without it the history is compare-only
  canRestore?: boolean;
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
    const confirmed = await confirmDialog({
      title: `Restore version ${version}?`,
      message: dirty
        ? "It is copied into the draft and your unsaved edits will be lost. The live site does not change until you publish."
        : "It is copied into the draft. The live site does not change until you publish.",
      confirmLabel: "Restore",
      tone: dirty ? "danger" : "default",
    });
    if (!confirmed) return;
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
    <section className="card space-y-4 p-5 sm:p-6">
      <div>
        <h4 className="font-display text-lg font-semibold text-on-surface">Version history</h4>
        <p className="mt-1 text-sm text-on-surface-variant">
          Every publish is saved (the latest 20). Restoring copies a version into the draft; publish it to make it live.
        </p>
      </div>

      {loading ? (
        <div className="panel h-16" aria-busy="true" />
      ) : error ? (
        <p className="notice notice-error" role="alert">{error}</p>
      ) : revisions.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Nothing published yet. Versions appear here after the first publish.</p>
      ) : (
        <ul className="divide-y divide-outline-variant overflow-hidden rounded-lg border border-outline-variant">
          {revisions.map((revision) => (
            <li key={revision._id} className="space-y-2 px-4 py-3 even:bg-surface-container/50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-on-surface">Version {revision.version}</span>
                  {revision.version === page.version && (
                    <span className="chip"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />Live</span>
                  )}
                  <span className="text-sm text-on-surface-variant">
                    {formatDateTime(revision.createdAt)}{revision.publishedByName && ` by ${revision.publishedByName}`}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => compare(revision.version)} disabled={busy !== null}
                    className="btn btn-ghost btn-sm">
                    {busy === `compare-${revision.version}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <GitCompare className="h-3.5 w-3.5" aria-hidden="true" />}
                    {compared?.version === revision.version ? "Hide" : "Compare"}
                  </button>
                  {canRestore && (
                    <button type="button" onClick={() => restore(revision.version)} disabled={busy !== null}
                      className="btn btn-secondary btn-sm">
                      {busy === `restore-${revision.version}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                      Restore
                    </button>
                  )}
                </div>
              </div>

              {compared?.version === revision.version && (
                <div className="panel px-4 py-3 text-sm text-on-surface-variant">
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
