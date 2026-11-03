"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Check, ChevronDown, Search } from "lucide-react";
import { countryOptions, type CountryOption } from "../lib/phone";

type PhoneFieldProps = {
  /** The country the visitor picked. */
  country: CountryOption;
  onCountryChange: (country: CountryOption) => void;
  /** The national number, without the country code. */
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  placeholder?: string;
};

/** Height the list takes when it is fully open. */
const MENU_HEIGHT = 320;
/** Gap between the field and the list. */
const MENU_GAP = 4;
/** Height of the search row at the top of the list. */
const MENU_HEADER = 62;

/** The flag of a country, drawn from the copies in public/flags. */
function CountryFlag({ code }: { code: string }) {
  return (
    <Image
      src={`/flags/${code.toLowerCase()}.svg`}
      alt=""
      width={20}
      height={15}
      aria-hidden="true"
      className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover ring-1 ring-outline-variant"
    />
  );
}

/**
 * A country picker with a national number box next to it. The two parts are
 * sent as one E.164 number, so a number always carries its country code.
 */
export function PhoneCountryField({
  country,
  onCountryChange,
  value,
  onValueChange,
  disabled = false,
  invalid = false,
  id,
  placeholder = "1712345678",
}: PhoneFieldProps) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [menu, setMenu] = useState<{ left: number; top: number; width: number; height: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return countryOptions;
    return countryOptions.filter(
      (option) =>
        option.name.toLowerCase().includes(needle) ||
        option.code.toLowerCase() === needle ||
        option.dialCode.includes(needle.replace(/^\+/, "")),
    );
  }, [query]);

  // The list opens above the field. It is placed on the page (not inside the
  // form card) so the scrolling form column cannot clip it.
  const placeMenu = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 48);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const opensUp = spaceAbove >= MENU_HEIGHT || spaceAbove >= spaceBelow;
    const room = Math.max(160, Math.min(MENU_HEIGHT, (opensUp ? spaceAbove : spaceBelow) - MENU_GAP));
    const top = opensUp ? rect.top - room - MENU_GAP : rect.bottom + MENU_GAP;
    setMenu({ left, top: Math.max(8, top), width, height: room });
  }, []);

  const open = () => {
    setIsOpen(true);
    setQuery("");
    setActiveIndex(0);
    placeMenu();
    // The search box needs the focus after the list is on screen
    window.setTimeout(() => searchRef.current?.focus(), 0);
  };

  const close = () => {
    setIsOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  };

  // Keep the list where it belongs when the page moves under it.
  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => placeMenu();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen, placeMenu]);

  const pick = (option: CountryOption) => {
    onCountryChange(option);
    close();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter" && filtered[activeIndex]) {
      event.preventDefault();
      pick(filtered[activeIndex]);
    }
  };

  const list = (
    <div
      className="fixed z-50 overflow-hidden rounded-lg border border-outline-variant bg-surface-raised shadow-xl"
      style={{
        left: menu?.left ?? 0,
        top: menu?.top ?? 0,
        width: menu?.width ?? 320,
      }}
      onKeyDown={onKeyDown}
    >
      <div className="border-b border-outline-variant p-2">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search a country"
            aria-label="Search a country"
            className="field field-sm pl-8"
          />
        </div>
      </div>

      <ul
        id={listId}
        role="listbox"
        className="overflow-y-auto py-1"
        style={{ maxHeight: Math.max(80, (menu?.height ?? MENU_HEIGHT) - MENU_HEADER) }}
      >
        {filtered.length === 0 && (
          <li className="px-3 py-3 text-sm text-on-surface-variant">No country found</li>
        )}
        {filtered.map((option, index) => (
          <li key={option.code}>
            <button
              type="button"
              role="option"
              aria-selected={option.code === country.code}
              onClick={() => pick(option)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                index === activeIndex ? "bg-surface-container" : ""
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <CountryFlag code={option.code} />
                <span className="truncate text-on-surface">{option.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-on-surface-variant">{option.dialCode}</span>
                {option.code === country.code && (
                  <Check aria-hidden="true" className="h-3.5 w-3.5 text-secondary" />
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="relative">
      <div className="flex gap-2">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (isOpen ? close() : open())}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "Enter") {
              event.preventDefault();
              if (!isOpen) open();
            }
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listId}
          disabled={disabled}
          className={`field flex w-auto min-w-32 max-w-[50%] shrink-0 items-center justify-between gap-2 text-left ${
            invalid ? "field-invalid" : ""
          }`}
        >
          <span className="flex items-center gap-2">
            <CountryFlag code={country.code} />
            <span className="font-semibold text-on-surface">{country.dialCode}</span>
            <span className="max-w-16 truncate text-sm text-on-surface-variant">{country.code}</span>
          </span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-on-surface-variant" />
        </button>

        <input
          id={id}
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={(event) => onValueChange(event.target.value.replace(/[^\d]/g, ""))}
          disabled={disabled}
          required
          placeholder={placeholder}
          autoComplete="tel-national"
          className={`field min-w-24 flex-1 ${invalid ? "field-invalid" : ""}`}
        />
      </div>

      {isOpen &&
        mounted &&
        createPortal(
          <>
            {/* Clicking outside closes the list */}
            <button
              type="button"
              aria-label="Close the country list"
              tabIndex={-1}
              onClick={close}
              className="fixed inset-0 z-40 cursor-default"
            />
            {list}
          </>,
          document.body,
        )}
    </div>
  );
}
