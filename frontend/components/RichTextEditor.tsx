"use client";

/*
  Small, calm rich-text editor (Tiptap) for long dashboard fields such as the
  lawyer biography and case descriptions. The value is an HTML string; an empty
  editor reports '' (never '<p></p>'). Legacy plain-text values are converted to
  paragraphs when loaded. Render stored values with <RichText>.
*/

import { useEffect, useId, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading3,
  Link2,
  Unlink,
  Undo2,
  Redo2,
  Check,
  X,
} from "lucide-react";
import { RICH_TEXT_BODY, RICH_TEXT_PROSE_CLASS, isRichTextEmpty, toSafeRichHtml } from "../lib/richText";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Maximum visible characters (markup is not counted). Shows a counter when set. */
  maxLength?: number;
  disabled?: boolean;
  /** Accessible name for the editing area (use when there is no visible <label>). */
  ariaLabel?: string;
  /** id of a visible label element describing the editor. */
  ariaLabelledBy?: string;
  id?: string;
  lang?: string;
  invalid?: boolean;
  /** Tailwind min-height class for the editing area. */
  minHeightClass?: string;
  className?: string;
};

const toEditorHtml = (value: string) => toSafeRichHtml(value);
const toStoredHtml = (editor: Editor) => {
  const html = editor.getHTML();
  return editor.isEmpty || isRichTextEmpty(html) ? "" : html;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  maxLength,
  disabled = false,
  ariaLabel,
  ariaLabelledBy,
  id,
  lang,
  invalid = false,
  minHeightClass = "min-h-32",
  className,
}: RichTextEditorProps) {
  const autoId = useId();
  const editorId = id ?? `rte-${autoId}`;
  // Last value this editor emitted, so outside value changes (form reset, data load) can be told apart
  const lastEmitted = useRef<string>(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
        code: false,
        codeBlock: false,
        strike: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          defaultProtocol: "https",
          protocols: ["http", "https", "mailto"],
          isAllowedUri: (url, ctx) => /^(https?:|mailto:)/i.test(url) && ctx.defaultValidate(url),
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
        },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      // autoTrim off: an over-long legacy value must never be cut silently on load
      CharacterCount.configure({ limit: maxLength ?? null, autoTrim: false }),
    ],
    content: toEditorHtml(value),
    editorProps: {
      attributes: {
        id: editorId,
        role: "textbox",
        "aria-multiline": "true",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
        ...(ariaLabelledBy ? { "aria-labelledby": ariaLabelledBy } : {}),
        ...(invalid ? { "aria-invalid": "true" } : {}),
        ...(lang ? { lang } : {}),
        class: `${RICH_TEXT_PROSE_CLASS} prose-sm ${minHeightClass} px-3 py-2.5 text-on-surface focus:outline-none ${RICH_TEXT_BODY.strong}`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = toStoredHtml(ed);
      lastEmitted.current = html;
      onChangeRef.current(html);
    },
  });

  // Sync when the value is changed from outside (profile loaded, form reset, ...)
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(toEditorHtml(value), { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) =>
      ed
        ? {
            bold: ed.isActive("bold"),
            italic: ed.isActive("italic"),
            underline: ed.isActive("underline"),
            bulletList: ed.isActive("bulletList"),
            orderedList: ed.isActive("orderedList"),
            heading: ed.isActive("heading", { level: 3 }),
            link: ed.isActive("link"),
            canUndo: ed.can().undo(),
            canRedo: ed.can().redo(),
            characters: ed.storage.characterCount?.characters() ?? 0,
          }
        : null,
  });

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");

  const openLink = () => {
    if (!editor) return;
    setLinkUrl((editor.getAttributes("link").href as string | undefined) ?? "");
    setLinkError("");
    setLinkOpen(true);
  };

  const applyLink = () => {
    if (!editor) return;
    let url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkOpen(false);
      return;
    }
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) url = `mailto:${url}`;
    else if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;
    if (!/^(https?:\/\/[^\s]+|mailto:[^\s]+)$/i.test(url)) {
      setLinkError("Use a web address (https://…) or an email address.");
      return;
    }
    const chain = editor.chain().focus().extendMarkRange("link");
    if (editor.state.selection.empty && !editor.isActive("link")) {
      chain.insertContent({ type: "text", text: linkUrl.trim(), marks: [{ type: "link", attrs: { href: url } }] }).run();
    } else {
      chain.setLink({ href: url }).run();
    }
    setLinkOpen(false);
  };

  const removeLink = () => {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  };

  const ready = Boolean(editor && state);
  const off = disabled || !ready;
  const characters = state?.characters ?? 0;
  const nearLimit = maxLength ? characters >= maxLength * 0.9 : false;

  return (
    <div
      className={`overflow-hidden rounded-md border bg-(--clr-field) shadow-(--elev-inset) transition-[border-color,box-shadow] duration-150 ease-out focus-within:border-secondary focus-within:shadow-[var(--elev-inset),0_0_0_3px_rgb(var(--clr-secondary-rgb)/0.28)] ${
        invalid ? "border-error" : "border-(--clr-field-border)"
      } ${disabled ? "opacity-60" : ""} ${className ?? ""}`}
    >
      <div
        role="toolbar"
        aria-label="Formatting"
        aria-controls={editorId}
        className="flex flex-wrap items-center gap-0.5 border-b border-outline-variant bg-surface-container px-1.5 py-1"
      >
        <ToolButton label="Bold" active={state?.bold} disabled={off} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Italic" active={state?.italic} disabled={off} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Underline" active={state?.underline} disabled={off} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolButton>
        <Divider />
        <ToolButton label="Heading" active={state?.heading} disabled={off} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Bulleted list" active={state?.bulletList} disabled={off} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Numbered list" active={state?.orderedList} disabled={off} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolButton>
        <Divider />
        <ToolButton label={state?.link ? "Edit link" : "Add link"} active={state?.link || linkOpen} disabled={off} onClick={openLink}>
          <Link2 className="h-4 w-4" />
        </ToolButton>
        {state?.link && (
          <ToolButton label="Remove link" disabled={off} onClick={removeLink}>
            <Unlink className="h-4 w-4" />
          </ToolButton>
        )}
        <span className="ml-auto flex items-center gap-0.5">
          <ToolButton label="Undo" disabled={off || !state?.canUndo} onClick={() => editor?.chain().focus().undo().run()}>
            <Undo2 className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Redo" disabled={off || !state?.canRedo} onClick={() => editor?.chain().focus().redo().run()}>
            <Redo2 className="h-4 w-4" />
          </ToolButton>
        </span>
      </div>

      {linkOpen && (
        <div className="border-b border-outline-variant bg-surface-container px-2 py-2">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              inputMode="url"
              autoFocus
              value={linkUrl}
              onChange={(e) => {
                setLinkUrl(e.target.value);
                setLinkError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setLinkOpen(false);
                  editor?.commands.focus();
                }
              }}
              placeholder="https://example.com or name@example.com"
              aria-label="Link address"
              className="field min-h-9 min-w-0 flex-1 py-1.5"
            />
            <ToolButton label="Apply link" onClick={applyLink}>
              <Check className="h-4 w-4" />
            </ToolButton>
            <ToolButton
              label="Cancel"
              onClick={() => {
                setLinkOpen(false);
                editor?.commands.focus();
              }}
            >
              <X className="h-4 w-4" />
            </ToolButton>
          </div>
          {linkError && <p className="mt-1 text-xs text-error">{linkError}</p>}
        </div>
      )}

      {editor ? (
        <EditorContent
          editor={editor}
          className="[&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-on-surface-variant/60 [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]"
        />
      ) : (
        // Placeholder box while the editor mounts on the client (keeps layout stable)
        <div className={`${minHeightClass} px-3 py-2.5 text-sm text-on-surface-variant/60`}>{placeholder}</div>
      )}

      {maxLength ? (
        <div className="flex justify-end border-t border-outline-variant px-3 py-1">
          <span aria-live="polite" className={`text-[11px] tabular-nums ${nearLimit ? "text-error" : "text-on-surface-variant"}`}>
            {characters.toLocaleString()}/{maxLength.toLocaleString()}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function ToolButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep the editor selection when clicking toolbar buttons
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-surface-container-high text-on-surface shadow-(--elev-inset)"
          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-outline-variant" />;
}

export default RichTextEditor;
