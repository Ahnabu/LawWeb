"use client";

import { useId, useMemo, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  const open = () => {
    setIsOpen(true);
    setQuery("");
    setActiveIndex(0);
    // The search box needs the focus after the list is on screen
    window.setTimeout(() => searchRef.current?.focus(), 0);
  };

  const close = () => {
    setIsOpen(false);
    setQuery("");
  };

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

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex gap-2">
        <button
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
          className={`field flex min-w-30 shrink-0 items-center justify-between gap-2 text-left ${
            invalid ? "field-invalid" : ""
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className="font-semibold text-on-surface">{country.dialCode}</span>
            <span className="max-w-24 truncate text-sm text-on-surface-variant">{country.code}</span>
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
          className={`field flex-1 ${invalid ? "field-invalid" : ""}`}
        />
      </div>

      {isOpen && (
        <>
          {/* Clicking outside closes the list */}
          <button
            type="button"
            aria-label="Close the country list"
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            className="absolute left-0 z-50 mt-1 w-[min(20rem,calc(100vw-3rem))] overflow-hidden rounded-lg border border-outline-variant bg-surface-raised shadow-xl"
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

            <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
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
                    <span className="truncate text-on-surface">{option.name}</span>
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
        </>
      )}
    </div>
  );
}
