// Saves the published CMS content to lib/contentSnapshot.json before each
// build (npm "prebuild"). lib/content.ts falls back to this snapshot when the
// backend can't be reached, so a failed fetch still renders the live text
// instead of the old code defaults. Also warms a cold backend before the
// build prerenders every page.
//
// Never fails the build: if the backend is unreachable the existing snapshot
// (committed to git) is kept.

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const SNAPSHOT_PATH = fileURLToPath(new URL('../lib/contentSnapshot.json', import.meta.url))
const ATTEMPTS = 3
const TIMEOUT_MS = 20000

// Same normalisation as resolveApiBaseUrl() in lib/api.ts
function apiBaseUrl() {
  let url = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (!url) return null
  if (!/^https?:\/\//i.test(url)) {
    const isLocal = url.startsWith('localhost') || url.startsWith('127.0.0.1')
    url = isLocal ? `http://${url}` : `https://${url}`
  }
  return url.replace(/\/+$/, '')
}

async function fetchContent(baseUrl) {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${baseUrl}/api/content`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (res.ok) {
        const body = await res.json()
        if (body && typeof body.data === 'object' && body.data !== null) return body.data
      }
      console.warn(`[content snapshot] attempt ${attempt}: HTTP ${res.status}`)
    } catch (error) {
      console.warn(`[content snapshot] attempt ${attempt}: ${error.message}`)
    }
  }
  return null
}

async function main() {
  const baseUrl = apiBaseUrl()
  if (!baseUrl) {
    console.warn('[content snapshot] NEXT_PUBLIC_API_URL not set; keeping the existing snapshot')
    return
  }

  const data = await fetchContent(baseUrl)
  if (!data) {
    console.warn('[content snapshot] backend unreachable; keeping the existing snapshot')
    return
  }

  // Leave the file alone when nothing changed, so local builds don't dirty git
  const next = `${JSON.stringify({ data }, null, 2)}\n`
  const current = await readFile(SNAPSHOT_PATH, 'utf8').catch(() => '')
  if (current === next) {
    console.log('[content snapshot] unchanged')
    return
  }
  await writeFile(SNAPSHOT_PATH, next)
  console.log(`[content snapshot] saved ${Object.keys(data).length} pages`)
}

main().catch((error) => console.warn('[content snapshot] skipped:', error))
