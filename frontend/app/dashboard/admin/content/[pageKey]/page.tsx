"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye, ExternalLink, History, Languages, Loader2, RotateCcw, Save, Send } from "lucide-react";
import { CONTENT_REVALIDATE_SECONDS, type PageContent, type SiteSettingsOverride, type StringOverride, type StringOverrides } from "../../../../../lib/content";
import { getPageDef } from "../../../../../lib/contentRegistry";
import { localizePath } from "../../../../../lib/locale";
import {
  ContentSaveError,
  banglaStatus,
  cleanPageData,
  describeFieldPath,
  discardContentDraft,
  getAdminContentPage,
  getListItems,
  publishContentPage,
  saveContentDraft,
  stableStringify,
  type AdminContentPage,
  type FieldError,
  type ListItem,
} from "../../../../../lib/adminContent";
import { ImageFieldEditor, ListEditor, SiteSettingsEditor, TextFieldEditor } from "../../../../../components/ContentEditorFields";
import { ContentHistory } from "../../../../../components/ContentHistory";
import { confirmDialog } from "../../../../../components/ConfirmDialog";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

type Busy = "save" | "publish" | "discard" | "preview" | null;

export default function AdminContentEditorPage() {
  const { pageKey } = useParams<{ pageKey: string }>();
  const def = getPageDef(pageKey);

  const [page, setPage] = useState<AdminContentPage | null>(null);
  const [data, setData] = useState<PageContent>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const applyPage = (next: AdminContentPage) => {
    setPage(next);
    setData(next.draft ?? {});
  };

  useEffect(() => {
    if (!def) return;
    getAdminContentPage(def.key)
      .then(applyPage)
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load page content"))
      .finally(() => setLoading(false));
  }, [def]);

  const cleaned = useMemo(() => (def ? cleanPageData(def, data) : {}), [def, data]);
  const dirty = useMemo(
    () => !!def && !!page && stableStringify(cleaned) !== stableStringify(cleanPageData(def, page.draft ?? {})),
    [def, page, cleaned],
  );
  const bangla = useMemo(() => (def ? banglaStatus(def, data) : null), [def, data]);

  // Warn before leaving with unsaved edits
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setString = useCallback((key: string, value: StringOverride | undefined) => {
    setData((prev) => {
      const strings: StringOverrides = { ...(prev.strings ?? {}) };
      if (value) strings[key] = value;
      else delete strings[key];
      return { ...prev, strings };
    });
  }, []);

  const setList = useCallback((name: string, items: ListItem[] | undefined) => {
    setData((prev) => {
      const next = { ...prev };
      if (items) next[name] = items;
      else delete next[name];
      return next;
    });
  }, []);

  const setImage = useCallback((name: string, url: string | undefined) => {
    setData((prev) => {
      const next = { ...prev };
      if (url) next[name] = url;
      else delete next[name];
      return next;
    });
  }, []);

  const setSettings = useCallback((settings: SiteSettingsOverride) => {
    setData((prev) => ({ ...prev, settings }));
  }, []);

  if (!def) {
    return (
      <div className="space-y-4">
        <BackLink dirty={false} />
        <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">Unknown content page.</div>
      </div>
    );
  }

  const handleError = (e: unknown, fallback: string) => {
    if (e instanceof ContentSaveError) setErrors(e.errors);
    toast.error(e instanceof Error ? e.message : fallback);
  };

  // Returns the saved page, or null when saving failed (error already shown)
  const saveDraft = async (): Promise<AdminContentPage | null> => {
    setErrors([]);
    try {
      const saved = await saveContentDraft(def.key, cleaned);
      applyPage(saved);
      return saved;
    } catch (e) {
      handleError(e, "Failed to save draft");
      return null;
    }
  };

  const save = async () => {
    setBusy("save");
    const saved = await saveDraft();
    if (saved) {
      if (saved.hasUnpublishedChanges) toast.success("Draft saved. Publish to make it live.");
      else toast.info("Draft saved. It matches the live version, so there is nothing to publish.");
    }
    setBusy(null);
  };

  const publish = async () => {
    setBusy("publish");
    try {
      if (dirty) {
        const saved = await saveDraft();
        if (!saved) return;
        if (!saved.hasUnpublishedChanges) {
          toast.info("Nothing to publish. The live site already shows this content.");
          return;
        }
      }
      const { page: published, liveUpdated } = await publishContentPage(def.key);
      applyPage(published);
      const viewAction = def.publicPath
        ? { action: { label: "View page", onClick: () => window.open(def.publicPath, "_blank", "noopener") } }
        : {};
      if (liveUpdated) {
        toast.success(`${def.title} published`, viewAction);
      } else {
        toast.warning(`${def.title} published`, {
          ...viewAction,
          description: `The live site picks up the change within ${Math.round(CONTENT_REVALIDATE_SECONDS / 60)} minutes.`,
          duration: 8000,
        });
      }
    } catch (e) {
      handleError(e, "Failed to publish");
    } finally {
      setBusy(null);
    }
  };

  const discard = async () => {
    const confirmed = await confirmDialog(page?.hasUnpublishedChanges
      ? { title: "Discard all unpublished changes?", message: "The draft goes back to the live version.", confirmLabel: "Discard", tone: "danger" }
      : { title: "Discard your unsaved edits?", confirmLabel: "Discard", tone: "danger" });
    if (!confirmed) return;
    setErrors([]);
    if (!page?.hasUnpublishedChanges) {
      if (page) applyPage(page);
      toast.success("Edits discarded");
      return;
    }
    setBusy("discard");
    try {
      applyPage(await discardContentDraft(def.key));
      toast.success("Changes discarded");
    } catch (e) {
      handleError(e, "Failed to discard changes");
    } finally {
      setBusy(null);
    }
  };

  // Opens the public page with ?preview=1, which renders every page's saved
  // draft. Unsaved edits are saved first (saving never changes the live site).
  const preview = async () => {
    // Open the tab synchronously so the popup blocker allows it
    const tab = window.open("about:blank", "_blank");
    if (dirty) {
      setBusy("preview");
      const saved = await saveDraft();
      setBusy(null);
      if (!saved) return tab?.close();
    }
    const url = `${def.publicPath ?? "/"}?preview=1`;
    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    } else {
      window.location.href = url;
    }
  };

  const canPublish = dirty || !!page?.hasUnpublishedChanges;

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink dirty={dirty} />
        {page && (
          <div className="flex flex-wrap items-center gap-2">
            {dirty && <span className="text-xs font-medium text-yellow-700">Unsaved changes</span>}
            <button onClick={() => setShowHistory((v) => !v)} aria-pressed={showHistory}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${showHistory ? "border-secondary bg-secondary/10 text-secondary" : "border-outline-variant text-on-surface-variant hover:bg-surface-container"}`}>
              <History className="h-3.5 w-3.5" /> History
            </button>
            <button onClick={preview} disabled={busy !== null} title={dirty ? "Saves your edits as a draft, then opens the preview" : "Open the site showing the saved drafts"}
              className="flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50 transition">
              {busy === "preview" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />} {dirty ? "Save & Preview" : "Preview"}
            </button>
            <button onClick={discard} disabled={!canPublish || busy !== null}
              className="flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50 transition">
              {busy === "discard" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Discard
            </button>
            <button onClick={save} disabled={!dirty || busy !== null}
              className="flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50 transition">
              {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save Draft
            </button>
            <button onClick={publish} disabled={!canPublish || busy !== null}
              className="flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-1.5 text-xs font-semibold text-primary hover:opacity-90 disabled:opacity-50 transition">
              {busy === "publish" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Publish
            </button>
          </div>
        )}
      </div>

      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">{def.title}</h3>
          {def.publicPath && (
            <a href={def.publicPath} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-secondary hover:underline">
              View live page <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {def.publicPath && (
            <a href={localizePath(def.publicPath, "bn")} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-secondary hover:underline">
              Bangla page <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <p className="text-sm text-on-surface-variant">{def.description}</p>
        {page && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
            <span>
              {page.version === 0
                ? "Never published — the site shows the default content"
                : `Live: version ${page.version}${page.publishedAt ? `, ${formatDateTime(page.publishedAt)}` : ""}${page.publishedByName ? ` by ${page.publishedByName}` : ""}`}
            </span>
            {page.hasUnpublishedChanges && page.draftUpdatedAt && (
              <span className="font-semibold text-yellow-700">
                Draft saved {formatDateTime(page.draftUpdatedAt)}{page.draftUpdatedByName && ` by ${page.draftUpdatedByName}`} — not published yet
              </span>
            )}
            {bangla && (
              <span className={`flex items-center gap-1 ${bangla.missing || bangla.outdated ? "font-semibold text-orange-600" : ""}`}>
                <Languages className="h-3.5 w-3.5" /> Bangla {bangla.percent}%{bangla.missing > 0 && ` · ${bangla.missing} missing`}{bangla.outdated > 0 && ` · ${bangla.outdated} outdated`}
              </span>
            )}
          </div>
        )}
      </header>

      {errors.length > 0 && (
        <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          <p className="font-semibold">Please fix these fields:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {errors.map((err, i) => <li key={i}>{describeFieldPath(def, err.field)}: {err.message}</li>)}
          </ul>
        </div>
      )}

      {showHistory && page && (
        <ContentHistory def={def} page={page} current={cleaned} dirty={dirty} onRestored={(next) => { setErrors([]); applyPage(next); }} />
      )}

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl border border-outline-variant bg-surface-container" />)}</div>
      ) : loadError ? (
        <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">{loadError}</div>
      ) : (
        def.sections.map((section) => {
          const list = section.list;
          const listState = list ? getListItems(data, list) : null;
          return (
            <section key={section.title} className="space-y-4 rounded-xl border border-outline-variant bg-surface-container p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{section.title}</p>
                {section.description && <p className="mt-1 text-xs text-on-surface-variant">{section.description}</p>}
              </div>

              {section.settings && (
                <SiteSettingsEditor settings={(data.settings ?? {}) as SiteSettingsOverride} onChange={setSettings} />
              )}

              {section.images?.map((field) => (
                <ImageFieldEditor key={field.name} field={field}
                  value={typeof data[field.name] === "string" ? (data[field.name] as string) : undefined}
                  onChange={(url) => setImage(field.name, url)} />
              ))}

              {section.texts?.map((field) => (
                <TextFieldEditor key={field.key} field={field} override={data.strings?.[field.key]}
                  onChange={(value) => setString(field.key, value)} />
              ))}

              {list && listState && (
                <ListEditor list={list} items={listState.items} customized={listState.customized}
                  onChange={(items) => setList(list.name, items)} onReset={() => setList(list.name, undefined)} />
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

function BackLink({ dirty }: { dirty: boolean }) {
  const router = useRouter();
  const href = "/dashboard/admin/content";
  const leave = async (e: React.MouseEvent) => {
    if (!dirty) return;
    e.preventDefault();
    const confirmed = await confirmDialog({
      title: "Leave without saving?",
      message: "You have unsaved changes on this page.",
      confirmLabel: "Leave",
      tone: "danger",
    });
    if (confirmed) router.push(href);
  };
  return (
    <Link href={href} onClick={leave}
      className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition">
      <ArrowLeft className="h-4 w-4" /> Back to Content
    </Link>
  );
}
