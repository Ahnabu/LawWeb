// Copies the flag SVGs the country picker needs into public/flags, so the
// browser loads them as plain static files (no bundler, no extra dependency
// at runtime). Run: node scripts/copy-flags.mjs

import { copyFileSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getCountries } from "libphonenumber-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "node_modules", "flag-icons", "flags", "4x3");
const OUT = join(ROOT, "public", "flags");

// The two libphonenumber territories whose flag lives under a parent code.
const ALIASES = { AC: "sh-ac", TA: "sh-ta" };

mkdirSync(OUT, { recursive: true });

const missing = [];
for (const code of getCountries()) {
  const source = join(SRC, `${ALIASES[code] ?? code.toLowerCase()}.svg`);
  if (!existsSync(source)) {
    missing.push(code);
    continue;
  }
  copyFileSync(source, join(OUT, `${code.toLowerCase()}.svg`));
}

copyFileSync(join(ROOT, "node_modules", "flag-icons", "LICENSE"), join(OUT, "LICENSE"));

if (missing.length) {
  console.warn(`[flags] no flag for: ${missing.join(", ")}`);
} else {
  console.log(`[flags] copied ${getCountries().length} flags`);
}
