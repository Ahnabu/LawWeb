"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, MailOpen, Reply, RotateCcw, Search, Trash2, X } from "lucide-react";
import { confirmDialog } from "../../../../components/ConfirmDialog";
import { Pagination } from "../../../../components/Pagination";
import { formatDate } from "../../../../lib/adminUsers";
import {
  deleteMessage,
  listMessages,
  setMessageStatus,
  type ContactMessage,
  type MessageCounts,
  type MessageFilter,
  type MessageStatus,
} from "../../../../lib/adminMessages";

const LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 350;

const FILTERS: { key: MessageFilter; label: string; hint: string }[] = [
  { key: "all", label: "Inbox", hint: "Everything not archived" },
  { key: "new", label: "Unread", hint: "Not opened yet" },
  { key: "read", label: "Read", hint: "Opened by an admin" },
  { key: "archived", label: "Archived", hint: "Handled and put away" },
];

const EMPTY_COUNTS: MessageCounts = { all: 0, new: 0, read: 0, archived: 0 };

const errorText = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [counts, setCounts] = useState<MessageCounts>(EMPTY_COUNTS);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MessageFilter>("all");
  const [page, setPage] = useState(1);

  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Ignores responses that arrive after a newer request was started
  const requestId = useRef(0);

  // Debounce typing; a new search always starts on page 1
  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const handle = window.setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput, search]);

  const fetchMessages = useCallback(
    async (options: { quiet?: boolean } = {}) => {
      const id = ++requestId.current;
      if (!options.quiet) setIsLoading(true);
      setError(null);
      try {
        const result = await listMessages({ search, status, page, limit: LIMIT });
        if (id !== requestId.current) return;
        setMessages(result.data);
        setTotal(result.meta?.total ?? 0);
        setCounts(result.meta?.counts ?? EMPTY_COUNTS);

        // The last item on a page was removed: step back instead of showing an empty page
        if (result.data.length === 0 && page > 1 && (result.meta?.total ?? 0) > 0) {
          setPage((p) => Math.max(1, p - 1));
        }
      } catch (err) {
        if (id !== requestId.current) return;
        setError(errorText(err, "Failed to load messages"));
      } finally {
        if (id === requestId.current) setIsLoading(false);
      }
    },
    [search, status, page],
  );

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  const changeStatus = (next: MessageFilter) => {
    setStatus(next);
    setPage(1);
    setOpenId(null);
  };

  const updateStatus = async (message: ContactMessage, next: MessageStatus) => {
    setBusyId(message._id);
    try {
      const result = await setMessageStatus(message._id, next);
      toast.success(result.message);
      void fetchMessages({ quiet: true });
      return true;
    } catch (err) {
      toast.error(errorText(err, "Failed to update message"));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  // Opening an unread message marks it as read. The list is updated in place
  // (no refetch) so the message stays open even on the Unread tab.
  const toggleOpen = (message: ContactMessage) => {
    const opening = openId !== message._id;
    setOpenId(opening ? message._id : null);
    if (!opening || message.status !== "new") return;

    setMessages((list) => list.map((m) => (m._id === message._id ? { ...m, status: "read" } : m)));
    setCounts((c) => ({ ...c, new: Math.max(0, c.new - 1), read: c.read + 1 }));
    setMessageStatus(message._id, "read").catch((err) => {
      toast.error(errorText(err, "Failed to mark message as read"));
      void fetchMessages({ quiet: true });
    });
  };

  const handleDelete = async (message: ContactMessage) => {
    const confirmed = await confirmDialog({
      title: "Delete this message?",
      message: `The message from ${message.name} will be permanently removed.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!confirmed) return;

    setBusyId(message._id);
    try {
      const result = await deleteMessage(message._id);
      toast.success(result.message || "Message deleted");
      if (openId === message._id) setOpenId(null);
      void fetchMessages({ quiet: true });
    } catch (err) {
      toast.error(errorText(err, "Failed to delete message"));
    } finally {
      setBusyId(null);
    }
  };

  const replyHref = (message: ContactMessage) =>
    `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject || "Your message"}`)}`;

  const activeFilter = FILTERS.find((f) => f.key === status);
  const hasQuery = Boolean(search) || status !== "all";

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="font-display text-xl font-semibold text-on-surface sm:text-2xl">Messages</h3>
        <p className="text-sm text-on-surface-variant">
          Messages sent from the Contact page. Open one to read it, reply by email, then archive it when handled.
        </p>
      </header>

      {/* Status filters, each with its count */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by message status">
        {FILTERS.map((filter) => {
          const selected = status === filter.key;
          return (
            <button
              key={filter.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => changeStatus(filter.key)}
              title={filter.hint}
              className={`chip ${selected ? "chip-active" : ""}`}
            >
              {filter.key === "new" && counts.new > 0 && (
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-secondary" />
              )}
              {filter.label}
              <span className="tabular-nums opacity-70">{counts[filter.key]}</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name, email, phone, subject or message"
          aria-label="Search messages"
          className="field pl-9 pr-11"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput("")}
            aria-label="Clear search"
            className="btn btn-ghost btn-icon absolute right-1 top-1/2 h-9 min-h-0 w-9 -translate-y-1/2"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="card h-80 bg-surface-container" aria-busy="true" />
      ) : error ? (
        <div className="notice notice-error flex flex-wrap items-center justify-between gap-3" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchMessages()}
            className="btn btn-secondary btn-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
          </button>
        </div>
      ) : messages.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-on-surface-variant">
            {hasQuery
              ? `No ${activeFilter && status !== "all" ? activeFilter.label.toLowerCase() + " " : ""}messages${search ? ` match "${search}"` : ""}.`
              : "No messages yet. Messages sent from the Contact page will appear here."}
          </p>
          {hasQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                changeStatus("all");
              }}
              className="btn btn-secondary btn-sm mt-4"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <ul className="card divide-y divide-outline-variant overflow-hidden">
            {messages.map((message) => {
              const open = openId === message._id;
              const busy = busyId === message._id;
              const unread = message.status === "new";
              return (
                <li key={message._id} className={busy ? "opacity-60" : ""}>
                  <button
                    type="button"
                    onClick={() => toggleOpen(message)}
                    aria-expanded={open}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-container/60 sm:px-5"
                  >
                    <span
                      className={`mt-2 h-2 w-2 shrink-0 rounded-full ${unread ? "bg-secondary" : "bg-transparent"}`}
                      aria-label={unread ? "Unread" : undefined}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={`truncate text-sm text-on-surface ${unread ? "font-semibold" : "font-medium"}`}>
                          {message.name}
                        </span>
                        <span className="shrink-0 text-xs text-on-surface-variant">{formatDate(message.createdAt, true)}</span>
                      </span>
                      <span className={`block truncate text-sm ${unread ? "text-on-surface" : "text-on-surface-variant"}`}>
                        {message.subject || "No subject"}
                      </span>
                      {!open && (
                        <span className="block truncate text-xs text-on-surface-variant">{message.message}</span>
                      )}
                    </span>
                  </button>

                  {open && (
                    <div className="space-y-4 border-t border-outline-variant bg-surface-container/40 px-4 py-4 sm:pl-10 sm:pr-5">
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-on-surface-variant">
                        <a href={`mailto:${message.email}`} className="text-link font-normal">
                          {message.email}
                        </a>
                        {message.phone && (
                          <a href={`tel:${message.phone.replace(/[^\d+]/g, "")}`} className="text-link font-normal">
                            {message.phone}
                          </a>
                        )}
                      </div>
                      <p className="panel whitespace-pre-line wrap-break-word px-4 py-3 text-sm leading-6 text-on-surface">{message.message}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={replyHref(message)}
                          className="btn btn-primary btn-sm"
                        >
                          <Reply className="h-3.5 w-3.5" aria-hidden="true" /> Reply by email
                        </a>
                        {message.status === "archived" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void updateStatus(message, "read")}
                            className="btn btn-secondary btn-sm"
                          >
                            <ArchiveRestore className="h-3.5 w-3.5" aria-hidden="true" /> Move to inbox
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void updateStatus(message, "archived")}
                              className="btn btn-secondary btn-sm"
                            >
                              <Archive className="h-3.5 w-3.5" aria-hidden="true" /> Archive
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                setOpenId(null);
                                void updateStatus(message, "new");
                              }}
                              className="btn btn-ghost btn-sm"
                            >
                              <MailOpen className="h-3.5 w-3.5" aria-hidden="true" /> Mark unread
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleDelete(message)}
                          className="btn btn-ghost btn-sm ml-auto hover:text-error"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <Pagination page={page} pageSize={LIMIT} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
