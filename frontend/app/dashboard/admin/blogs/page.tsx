"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { API_BASE_URL } from "../../../../lib/api";
import {
  Plus, X, Trash2, Newspaper, Pencil, Save, Send, Archive,
  ArrowLeft, ChevronUp, ChevronDown, ImagePlus, Loader2,
  Heading1, Heading2, Heading3, AlignLeft, Quote, Zap, Minus, List,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type BlockType = "h1" | "h2" | "h3" | "paragraph" | "quote" | "callout" | "divider" | "list";
type BlogStatus = "draft" | "published" | "archived";

interface Block { id: string; type: BlockType; content?: string; items?: string[] }

interface BlogSummary {
  _id: string; title: string; excerpt: string; category: string;
  status: BlogStatus; authorName: string; readingTimeMinutes: number; createdAt: string;
}
interface BlogFull extends BlogSummary { blocks: Block[]; tags: string[]; coverImageUrl?: string }

const CATEGORIES = [
  "immigration","criminal-law","civil-law","corporate-law","family-law",
  "real-estate","banking-finance","labor-law","tax-law","legal-tips","news","other",
];

const uid = () => Math.random().toString(36).slice(2, 9);
const freshForm = () => ({ title:"", excerpt:"", category:"legal-tips", tags:"", coverImageUrl:"", status:"draft" as BlogStatus });

// ── Block toolbar config ──────────────────────────────────────────────────────
const TOOLBAR = [
  { type:"h1" as BlockType,        label:"H1",        icon:<Heading1 className="h-4 w-4"/>,  tip:"Heading 1" },
  { type:"h2" as BlockType,        label:"H2",        icon:<Heading2 className="h-4 w-4"/>,  tip:"Heading 2" },
  { type:"h3" as BlockType,        label:"H3",        icon:<Heading3 className="h-4 w-4"/>,  tip:"Heading 3" },
  { type:"paragraph" as BlockType, label:"Para",      icon:<AlignLeft className="h-4 w-4"/>, tip:"Paragraph" },
  { type:"quote" as BlockType,     label:"Quote",     icon:<Quote className="h-4 w-4"/>,     tip:"Blockquote" },
  { type:"callout" as BlockType,   label:"Callout",   icon:<Zap className="h-4 w-4"/>,       tip:"Callout box" },
  { type:"list" as BlockType,      label:"List",      icon:<List className="h-4 w-4"/>,      tip:"Bullet list" },
  { type:"divider" as BlockType,   label:"Divider",   icon:<Minus className="h-4 w-4"/>,     tip:"Divider line" },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminBlogsPage() {
  const [view, setView] = useState<"list"|"editor">("list");
  const [blogs, setBlogs] = useState<BlogSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  // editor
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState(freshForm());
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string|null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchBlogs = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API_BASE_URL}/api/blogs/admin/all`, { credentials:"include" });
      if (!r.ok) throw new Error("Failed to fetch blogs");
      const d = await r.json();
      setBlogs(d.data ?? []);
    } catch(e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchBlogs(); }, [fetchBlogs]);

  // open new
  const openNew = () => {
    setEditId(null); setForm(freshForm()); setBlocks([]); setSaveErr(null); setSaved(false); setView("editor");
  };

  // open edit
  const openEdit = async (id: string) => {
    setSaveErr(null);
    try {
      const r = await fetch(`${API_BASE_URL}/api/blogs/admin/${id}`, { credentials:"include" });
      if (!r.ok) throw new Error("Failed to load blog");
      const { data }: { data: BlogFull } = await r.json();
      setForm({ title:data.title, excerpt:data.excerpt, category:data.category,
        tags:data.tags.join(", "), coverImageUrl:data.coverImageUrl??"", status:data.status });
      setBlocks((data.blocks??[]).map(b => ({ ...b, id:uid() })));
      setEditId(id); setSaved(false); setView("editor");
    } catch(e) { alert(e instanceof Error ? e.message : "Error"); }
  };

  // delete
  const doDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      const r = await fetch(`${API_BASE_URL}/api/blogs/${id}`, { method:"DELETE", credentials:"include" });
      if (!r.ok) throw new Error("Delete failed");
      setBlogs(p => p.filter(b => b._id !== id));
    } catch(e) { alert(e instanceof Error ? e.message : "Delete failed"); }
  };

  // block operations
  const addBlock = (type: BlockType) =>
    setBlocks(p => [...p, { id:uid(), type, content:"", items: type==="list" ? [""] : undefined }]);

  const upd = (id: string, patch: Partial<Block>) =>
    setBlocks(p => p.map(b => b.id===id ? {...b,...patch} : b));

  const del = (id: string) => setBlocks(p => p.filter(b => b.id!==id));

  const move = (id: string, dir: -1|1) => setBlocks(p => {
    const i = p.findIndex(b => b.id===id);
    if (i<0) return p;
    const n = [...p]; const s = i+dir;
    if (s<0||s>=n.length) return p;
    [n[i],n[s]]=[n[s],n[i]]; return n;
  });

  // cover upload
  const uploadCover = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("cover", file);
      const r = await fetch(`${API_BASE_URL}/api/blogs/upload/cover`, { method:"POST", credentials:"include", body:fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      setForm(f => ({ ...f, coverImageUrl: d.url }));
    } catch(e) { alert(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  };

  // save
  const save = async (statusOverride?: BlogStatus) => {
    setSaveErr(null); setSaved(false);
    if (!form.title.trim()||!form.excerpt.trim()) { setSaveErr("Title and excerpt are required."); return; }
    setSaving(true);
    try {
      const payload = {
        title:form.title, excerpt:form.excerpt, category:form.category,
        coverImageUrl:form.coverImageUrl||undefined,
        tags:form.tags.split(",").map(t=>t.trim()).filter(Boolean),
        status:statusOverride??form.status,
        blocks: blocks.map(({ id:_id, ...rest }) => rest),
      };
      const url = editId ? `${API_BASE_URL}/api/blogs/${editId}` : `${API_BASE_URL}/api/blogs`;
      const r = await fetch(url, {
        method: editId?"PATCH":"POST",
        headers:{"Content-Type":"application/json"},
        credentials:"include", body:JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message||"Save failed");
      if (!editId) setEditId(d.data._id);
      setForm(f => ({ ...f, status:d.data.status }));
      setSaved(true); void fetchBlogs();
      setTimeout(() => setSaved(false), 3000);
    } catch(e) { setSaveErr(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  // ── Editor view ─────────────────────────────────────────────────────────────
  if (view==="editor") return (
    <div className="space-y-5 max-w-3xl">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => setView("list")} className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition">
          <ArrowLeft className="h-4 w-4"/> Back to Blogs
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {saved && <span className="text-xs font-medium text-green-600">Saved ✓</span>}
          <button onClick={() => save("draft")} disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50 transition">
            <Save className="h-3.5 w-3.5"/> {saving?"Saving…":"Save Draft"}
          </button>
          <button onClick={() => save("archived")} disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-50 transition">
            <Archive className="h-3.5 w-3.5"/> Archive
          </button>
          <button onClick={() => save("published")} disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-1.5 text-xs font-semibold text-primary hover:opacity-90 disabled:opacity-50 transition">
            <Send className="h-3.5 w-3.5"/> Publish
          </button>
        </div>
      </div>

      <h3 className="font-display text-xl font-semibold text-on-surface">
        {editId ? "Edit Blog Post" : "New Blog Post"}
      </h3>

      {saveErr && <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-2 text-sm text-error">{saveErr}</div>}

      {/* Meta */}
      <div className="rounded-xl border border-outline-variant bg-surface-container p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Post Details</p>

        {/* Cover image */}
        <div>
          <p className="text-xs font-medium text-on-surface-variant mb-2">Cover Image</p>
          {form.coverImageUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-outline-variant">
              <img src={form.coverImageUrl} alt="Cover" className="w-full h-48 object-cover"/>
              <button onClick={() => setForm(f => ({...f, coverImageUrl:""}))}
                className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-error transition">
                <X className="h-4 w-4"/>
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline-variant py-8 text-sm text-on-surface-variant hover:border-secondary hover:text-secondary transition disabled:opacity-60">
              {uploading ? <><Loader2 className="h-5 w-5 animate-spin"/> Uploading…</> : <><ImagePlus className="h-5 w-5"/> Click to upload cover image</>}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && uploadCover(e.target.files[0])}/>
        </div>

        <label className="block text-xs font-medium text-on-surface-variant">
          Title <span className="text-error">*</span>
          <input value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))}
            placeholder="e.g. Understanding Immigration Law in Bangladesh"
            className="mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-secondary"/>
        </label>

        <label className="block text-xs font-medium text-on-surface-variant">
          Excerpt / Summary <span className="text-error">*</span>
          <textarea value={form.excerpt} onChange={e => setForm(f=>({...f,excerpt:e.target.value}))}
            rows={3} maxLength={300} placeholder="Brief summary shown on the blog listing (max 300 chars)"
            className="mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-secondary resize-none"/>
          <span className="block text-right text-xs text-on-surface-variant mt-0.5">{form.excerpt.length}/300</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-on-surface-variant">
            Category <span className="text-error">*</span>
            <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}
              className="mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-secondary">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/-/g," ").replace(/\b\w/g,l=>l.toUpperCase())}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-on-surface-variant">
            Tags <span className="text-on-surface-variant font-normal">(comma-separated)</span>
            <input value={form.tags} onChange={e => setForm(f=>({...f,tags:e.target.value}))}
              placeholder="visa, immigration, tips"
              className="mt-1 block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-secondary"/>
          </label>
        </div>
      </div>

      {/* Content builder */}
      <div className="rounded-xl border border-outline-variant bg-surface-container p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Content</p>

        {/* Always-visible block toolbar */}
        <div className="flex flex-wrap gap-2 rounded-lg border border-outline-variant bg-surface p-2">
          {TOOLBAR.map(bt => (
            <button key={bt.type} onClick={() => addBlock(bt.type)} title={bt.tip}
              className="flex items-center gap-1.5 rounded-md border border-outline-variant px-2.5 py-1.5 text-xs font-semibold text-on-surface-variant hover:border-secondary hover:bg-secondary/10 hover:text-secondary transition">
              {bt.icon} {bt.label}
            </button>
          ))}
        </div>

        {blocks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-outline-variant p-8 text-center">
            <p className="text-xs text-on-surface-variant">Click a block type above to start writing your content.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {blocks.map((block, idx) => (
              <BlockEditor key={block.id} block={block} index={idx} total={blocks.length}
                onChange={p => upd(block.id, p)} onRemove={() => del(block.id)} onMove={d => move(block.id, d)}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">Blog Management</h3>
          <p className="text-sm text-on-surface-variant">Write and publish articles for the public blog.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90 transition">
          <Plus className="h-4 w-4"/> New Blog Post
        </button>
      </header>

      {!loading && !error && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[["Total Posts", blogs.length],["Published", blogs.filter(b=>b.status==="published").length],["Drafts", blogs.filter(b=>b.status==="draft").length]].map(([l,v]) => (
            <div key={l as string} className="rounded-lg border border-outline-variant bg-surface-container p-4">
              <p className="text-sm text-on-surface-variant">{l}</p>
              <p className="mt-2 font-display text-3xl font-bold text-on-surface">{v}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[0,1,2].map(i=><div key={i} className="h-20 animate-pulse rounded-xl border border-outline-variant bg-surface-container"/>)}</div>
      ) : error ? (
        <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">{error}</div>
      ) : blogs.length===0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container p-10 text-center">
          <Newspaper className="mx-auto mb-3 h-9 w-9 text-on-surface-variant"/>
          <p className="text-sm text-on-surface-variant">No blog posts yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blogs.map(blog => (
            <div key={blog._id} className="rounded-xl border border-outline-variant bg-surface-container p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-semibold text-on-surface truncate">{blog.title}</p>
                    <StatusBadge status={blog.status}/>
                  </div>
                  <p className="text-xs text-on-surface-variant line-clamp-1">{blog.excerpt}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-on-surface-variant">
                    <span className="capitalize">{blog.category.replace(/-/g," ")}</span>
                    <span>{blog.readingTimeMinutes} min read</span>
                    <span>By {blog.authorName}</span>
                    <span>{new Date(blog.createdAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEdit(blog._id)}
                    className="flex items-center gap-1.5 rounded-lg border border-secondary/60 bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary hover:text-primary transition">
                    <Pencil className="h-3.5 w-3.5"/> Edit
                  </button>
                  <button onClick={() => doDelete(blog._id, blog.title)}
                    className="rounded-lg border border-outline-variant p-1.5 text-on-surface-variant hover:border-error/40 hover:bg-error/10 hover:text-error transition">
                    <Trash2 className="h-4 w-4"/>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Block editor ──────────────────────────────────────────────────────────────
function BlockEditor({ block, index, total, onChange, onRemove, onMove }: {
  block: Block; index: number; total: number;
  onChange: (p: Partial<Block>) => void; onRemove: () => void; onMove: (d: -1|1) => void;
}) {
  const base = "block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-on-surface outline-none focus:border-secondary";
  const label: Record<BlockType, string> = { h1:"H1 Heading", h2:"H2 Heading", h3:"H3 Heading", paragraph:"Paragraph", quote:"Quote", callout:"Callout", divider:"Divider", list:"List" };

  return (
    <div className="rounded-lg border border-outline-variant bg-surface p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-secondary">{label[block.type]}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={index===0} className="rounded p-1 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5"/></button>
          <button onClick={() => onMove(1)} disabled={index===total-1} className="rounded p-1 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5"/></button>
          <button onClick={onRemove} className="rounded p-1 text-on-surface-variant hover:bg-error/10 hover:text-error"><X className="h-3.5 w-3.5"/></button>
        </div>
      </div>

      {block.type==="divider" && <hr className="border-outline-variant"/>}

      {block.type==="h1" && <input value={block.content??""} onChange={e=>onChange({content:e.target.value})} placeholder="Heading 1…" className={`${base} text-2xl font-bold`}/>}
      {block.type==="h2" && <input value={block.content??""} onChange={e=>onChange({content:e.target.value})} placeholder="Heading 2…" className={`${base} text-xl font-bold`}/>}
      {block.type==="h3" && <input value={block.content??""} onChange={e=>onChange({content:e.target.value})} placeholder="Heading 3…" className={`${base} text-lg font-semibold`}/>}

      {block.type==="paragraph" && <textarea value={block.content??""} onChange={e=>onChange({content:e.target.value})} rows={5} placeholder="Write your paragraph…" className={`${base} resize-y text-sm`}/>}

      {block.type==="quote" && <textarea value={block.content??""} onChange={e=>onChange({content:e.target.value})} rows={3} placeholder="Quote text…" className={`${base} resize-y text-sm italic border-l-4 border-l-secondary pl-4`}/>}

      {block.type==="callout" && <textarea value={block.content??""} onChange={e=>onChange({content:e.target.value})} rows={2} placeholder="Callout / highlight…" className={`${base} resize-y text-sm bg-secondary/5 border-secondary/40`}/>}

      {block.type==="list" && (
        <div className="space-y-2">
          {(block.items??[]).map((item,i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-secondary font-bold shrink-0">•</span>
              <input value={item} onChange={e => { const n=[...(block.items??[])]; n[i]=e.target.value; onChange({items:n}); }}
                placeholder={`Item ${i+1}`} className={`${base} text-sm flex-1`}/>
              <button onClick={() => onChange({items:(block.items??[]).filter((_,j)=>j!==i)})} disabled={(block.items??[]).length<=1}
                className="text-on-surface-variant hover:text-error disabled:opacity-30"><X className="h-4 w-4"/></button>
            </div>
          ))}
          <button onClick={() => onChange({items:[...(block.items??[]),""]}) }
            className="flex items-center gap-1.5 text-xs text-primary hover:text-secondary transition">
            <Plus className="h-3.5 w-3.5"/> Add item
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: BlogStatus }) {
  const map: Record<BlogStatus,string> = { published:"bg-green-500/10 text-green-700", draft:"bg-secondary/10 text-secondary", archived:"bg-outline/20 text-on-surface-variant" };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${map[status]}`}>{status}</span>;
}
