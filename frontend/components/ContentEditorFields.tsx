"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, ImagePlus, Loader2, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { API_BASE_URL } from "../lib/api";
import { compressImage, formatBytes } from "../lib/imageCompression";
import type { SiteSettingsOverride, SocialLink, StringOverride } from "../lib/content";
import { LONG_TEXT, type ImageField, type ListDef, type ListItemField, type TextField } from "../lib/contentRegistry";
import {
  defaultText,
  emptyListItem,
  fingerprint,
  isBanglaOutdated,
  textBanglaState,
  type ListItem,
  type LocalizedValue,
} from "../lib/adminContent";
import { siteConfig } from "../lib/siteConfig";
import { apiFetch } from "../lib/http";

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputBase =
  "block w-full rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-secondary";
const smallButton =
  "flex items-center gap-1.5 rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition";

function TextInput({ value, onChange, placeholder, multiline, maxLength, lang }: {
  value: string; onChange: (value: string) => void; placeholder?: string;
  multiline?: boolean; maxLength: number; lang?: "en" | "bn";
}) {
  return multiline ? (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      maxLength={maxLength} rows={3} lang={lang} className={`${inputBase} resize-y`} />
  ) : (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      maxLength={maxLength} lang={lang} className={inputBase} />
  );
}

// Mark the current Bangla as written for the current English
const confirmBangla = (value: LocalizedValue): LocalizedValue => ({ ...value, bnFor: fingerprint(value.en) });

// English and Bangla side by side. Typing Bangla records which English it
// translates (bnFor), so a later English edit flags the Bangla as outdated.
function LocalizedInputs({ value, onChange, placeholder, multiline, maxLength, outdated = isBanglaOutdated(value) }: {
  value: LocalizedValue; onChange: (value: LocalizedValue) => void;
  placeholder?: LocalizedValue; multiline?: boolean; maxLength: number; outdated?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
          English
          <div className="mt-1 normal-case tracking-normal font-normal">
            <TextInput value={value.en} onChange={(en) => onChange({ ...value, en })} placeholder={placeholder?.en}
              multiline={multiline} maxLength={maxLength} lang="en" />
          </div>
        </label>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
          বাংলা
          <div className="mt-1 normal-case tracking-normal font-normal">
            <TextInput value={value.bn} onChange={(bn) => onChange(confirmBangla({ ...value, bn }))} placeholder={placeholder?.bn}
              multiline={multiline} maxLength={maxLength} lang="bn" />
          </div>
        </label>
      </div>
      {outdated && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-orange-600">
          <span className="font-semibold">The English changed after this Bangla was written.</span>
          <button type="button" onClick={() => onChange(confirmBangla(value))} className="font-semibold underline hover:no-underline">
            Bangla is up to date
          </button>
        </div>
      )}
    </div>
  );
}

// ── Text field (i18n key override) ────────────────────────────────────────────
export function TextFieldEditor({ field, override, onChange }: {
  field: TextField; override: StringOverride | undefined; onChange: (value: StringOverride | undefined) => void;
}) {
  const def = defaultText(field.key);
  const value = { en: override?.en ?? def.en, bn: override?.bn ?? def.bn, bnFor: override?.bnFor };
  const edited = value.en.trim() !== def.en || value.bn.trim() !== def.bn;
  const banglaState = textBanglaState(field.key, override);

  return (
    <div className="space-y-2 rounded-lg border border-outline-variant bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-on-surface">{field.label}</span>
          {edited && <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[11px] font-semibold text-secondary">Edited</span>}
          {banglaState === "missing" && (
            <>
              <span className="rounded-full bg-yellow-500/15 px-2 py-0.5 text-[11px] font-semibold text-yellow-700">
                English changed — update Bangla
              </span>
              <button type="button" onClick={() => onChange(confirmBangla(value))} title="The current Bangla still fits the new English"
                className="text-[11px] font-semibold text-on-surface-variant underline hover:no-underline">
                Keep Bangla
              </button>
            </>
          )}
          {banglaState === "outdated" && (
            <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-semibold text-orange-600">Bangla outdated</span>
          )}
        </div>
        {edited && (
          <button type="button" onClick={() => onChange(undefined)} className={smallButton} title="Use the default text">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}
      </div>
      <LocalizedInputs value={value} onChange={(next) => onChange(next)} placeholder={def}
        multiline={field.multiline} maxLength={LONG_TEXT} outdated={banglaState === "outdated"} />
    </div>
  );
}

// ── Repeatable list ───────────────────────────────────────────────────────────
export function ListEditor({ list, items, customized, onChange, onReset }: {
  list: ListDef; items: ListItem[]; customized: boolean;
  onChange: (items: ListItem[]) => void; onReset: () => void;
}) {
  const update = (index: number, item: ListItem) => onChange(items.map((it, i) => (i === index ? item : it)));
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-on-surface">{list.label}</span>
          <span className="text-xs text-on-surface-variant">{items.length}/{list.max}</span>
          {customized ? (
            <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[11px] font-semibold text-secondary">Edited</span>
          ) : (
            <span className="rounded-full bg-outline/20 px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">Default</span>
          )}
        </div>
        {customized && (
          <button type="button" onClick={onReset} className={smallButton} title="Use the default list">
            <RotateCcw className="h-3 w-3" /> Reset list
          </button>
        )}
      </div>

      {items.length === 0 && (
        <div className="rounded-lg border border-dashed border-outline-variant p-6 text-center text-xs text-on-surface-variant">
          This list is empty, so the section shows no items. Add one below or reset to the default list.
        </div>
      )}

      {items.map((item, index) => (
        <div key={index} className="space-y-3 rounded-lg border border-outline-variant bg-surface p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary">{list.itemLabel} {index + 1}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up"
                className="rounded p-1 text-on-surface-variant hover:bg-surface-container disabled:opacity-30">
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Move down"
                className="rounded p-1 text-on-surface-variant hover:bg-surface-container disabled:opacity-30">
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => remove(index)} aria-label={`Remove ${list.itemLabel.toLowerCase()}`}
                className="rounded p-1 text-on-surface-variant hover:bg-error/10 hover:text-error">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {list.fields ? (
            list.fields.map((field) => (
              <ListItemFieldEditor key={field.name} field={field}
                value={(item as Record<string, LocalizedValue | string>)[field.name]}
                onChange={(value) => update(index, { ...(item as Record<string, LocalizedValue | string>), [field.name]: value })} />
            ))
          ) : (
            <LocalizedInputs value={item as LocalizedValue} onChange={(value) => update(index, value)}
              maxLength={list.maxLength ?? LONG_TEXT} />
          )}
        </div>
      ))}

      <button type="button" onClick={() => onChange([...items, emptyListItem(list)])} disabled={items.length >= list.max}
        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-secondary disabled:opacity-40 transition">
        <Plus className="h-3.5 w-3.5" /> Add {list.itemLabel.toLowerCase()}
      </button>
    </div>
  );
}

function ListItemFieldEditor({ field, value, onChange }: {
  field: ListItemField; value: LocalizedValue | string | undefined; onChange: (value: LocalizedValue | string) => void;
}) {
  if (field.type === "localized") {
    const localized = (value as LocalizedValue | undefined) ?? { en: "", bn: "" };
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-on-surface-variant">
          {field.label} <span className="text-error">*</span>
        </p>
        <LocalizedInputs value={{ en: localized.en ?? "", bn: localized.bn ?? "", bnFor: localized.bnFor }} onChange={onChange}
          multiline={field.multiline} maxLength={field.maxLength} />
      </div>
    );
  }

  return (
    <label className="block text-xs font-medium text-on-surface-variant">
      {field.label}
      {field.type === "slug" && <span className="font-normal"> (lowercase, hyphens; used in links, e.g. family-law)</span>}
      <div className="mt-1 sm:max-w-xs">
        <TextInput value={(value as string | undefined) ?? ""} maxLength={field.maxLength}
          onChange={(next) => onChange(field.type === "slug" ? next.toLowerCase().replace(/\s+/g, "-") : next)} />
      </div>
    </label>
  );
}

// ── Site contact settings ─────────────────────────────────────────────────────
const SETTINGS_FIELDS: { name: "phone" | "phoneDisplay" | "fax" | "email" | "whatsappNumber"; label: string; hint: string; type?: string }[] = [
  { name: "phone", label: "Phone number", hint: "Used for call links", type: "tel" },
  { name: "phoneDisplay", label: "Phone (as displayed)", hint: "How the number is written on the site" },
  { name: "fax", label: "Fax", hint: "", type: "tel" },
  { name: "email", label: "Email", hint: "Shown in the footer when set", type: "email" },
  { name: "whatsappNumber", label: "WhatsApp number", hint: "Digits only, with country code (e.g. 8801XXXXXXXXX)" },
];

const SOCIAL_PLATFORMS: SocialLink["platform"][] = ["facebook", "linkedin", "youtube", "x", "instagram"];
const PLATFORM_LABELS: Record<SocialLink["platform"], string> = {
  facebook: "Facebook", linkedin: "LinkedIn", youtube: "YouTube", x: "X (Twitter)", instagram: "Instagram",
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // backend upload limit, checked after compression
const MAX_SOURCE_BYTES = 25 * 1024 * 1024; // larger originals are fine: they're compressed first

export function ImageFieldEditor({ field, value, onChange }: {
  field: ImageField; value: string | undefined; onChange: (value: string | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"compressing" | "uploading" | null>(null);

  const upload = async (source: File) => {
    if (!source.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (source.size > MAX_SOURCE_BYTES) return toast.error("Image must be 25 MB or smaller");
    try {
      setStatus("compressing");
      const { file, originalSize, compressed } = await compressImage(source);
      if (file.size > MAX_IMAGE_BYTES) throw new Error("Image is still over 8 MB after compression. Try a smaller photo.");

      setStatus("uploading");
      const fd = new FormData();
      fd.append("image", file);
      const res = await apiFetch(`${API_BASE_URL}/api/admin/content/upload`, { method: "POST", credentials: "include", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.url) throw new Error(body.message || "Upload failed");
      onChange(body.url);
      toast.success(compressed
        ? `Image uploaded (compressed ${formatBytes(originalSize)} → ${formatBytes(file.size)}). Save or publish to apply it.`
        : "Image uploaded. Save or publish to apply it.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setStatus(null);
    }
  };
  const uploading = status !== null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-on-surface">{field.label}</p>
      {field.hint && <p className="text-xs text-on-surface-variant">{field.hint}</p>}
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-outline-variant">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="aspect-[16/6] w-full object-cover" />
        </div>
      ) : (
        <div className="flex aspect-[16/6] w-full items-center justify-center rounded-lg border border-dashed border-outline bg-surface text-xs text-on-surface-variant">
          No image — the default background is used
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) upload(file); }} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className={smallButton}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          {status === "compressing" ? "Compressing…" : status === "uploading" ? "Uploading…" : value ? "Replace image" : "Upload image"}
        </button>
        {value && (
          <button type="button" onClick={() => onChange(undefined)} disabled={uploading} className={smallButton}>
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        )}
      </div>
      <p className="text-xs text-on-surface-variant">JPG, PNG or WebP, up to 25 MB. Large photos are resized to 1600px wide and compressed before upload.</p>
    </div>
  );
}

export function SiteSettingsEditor({ settings, onChange }: {
  settings: SiteSettingsOverride; onChange: (settings: SiteSettingsOverride) => void;
}) {
  const socials = settings.socials ?? siteConfig.socials;
  const setSocials = (next: SocialLink[]) => onChange({ ...settings, socials: next });

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {SETTINGS_FIELDS.map((field) => (
          <label key={field.name} className="block text-xs font-medium text-on-surface-variant">
            {field.label}
            <input type={field.type ?? "text"} value={settings[field.name] ?? ""}
              onChange={(e) => onChange({ ...settings, [field.name]: e.target.value })}
              placeholder={siteConfig[field.name] || "Not set"} maxLength={field.name === "phoneDisplay" ? 40 : 100}
              className={`mt-1 ${inputBase}`} />
            {field.hint && <span className="mt-1 block font-normal">{field.hint}</span>}
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-on-surface">Social links</p>
        <p className="text-xs text-on-surface-variant">Shown in the footer. Leave empty to hide the section.</p>
        {socials.map((social, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <select value={social.platform} aria-label="Platform"
              onChange={(e) => setSocials(socials.map((s, i) => (i === index ? { ...s, platform: e.target.value as SocialLink["platform"] } : s)))}
              className={`${inputBase} w-auto`}>
              {SOCIAL_PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
            </select>
            <input type="url" value={social.url} placeholder="https://" aria-label="Profile URL" maxLength={300}
              onChange={(e) => setSocials(socials.map((s, i) => (i === index ? { ...s, url: e.target.value } : s)))}
              className={`${inputBase} min-w-0 flex-1`} />
            <button type="button" onClick={() => setSocials(socials.filter((_, i) => i !== index))} aria-label="Remove link"
              className="rounded p-1.5 text-on-surface-variant hover:bg-error/10 hover:text-error">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setSocials([...socials, { platform: "facebook", url: "" }])} disabled={socials.length >= 10}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-secondary disabled:opacity-40 transition">
          <Plus className="h-3.5 w-3.5" /> Add social link
        </button>
      </div>
    </div>
  );
}
