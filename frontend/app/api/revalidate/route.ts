import { timingSafeEqual } from 'crypto'
import { revalidateTag } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'
import { CONTENT_CACHE_TAG } from '../../../lib/content'

// Called by the backend after a CMS publish (backend/src/utils/revalidate.ts)
// so the new content shows immediately instead of after the revalidate window.

const MAX_TAGS = 10
const ALLOWED_TAG = new RegExp(`^${CONTENT_CACHE_TAG}(:[a-z-]+)?$`)

function isValidSecret(provided: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET
  if (!expected || !provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  if (!isValidSecret(request.headers.get('x-revalidate-secret'))) {
    return NextResponse.json({ status: 401, message: 'Unauthorized' }, { status: 401 })
  }

  let tags: unknown
  try {
    tags = (await request.json())?.tags
  } catch {
    return NextResponse.json({ status: 400, message: 'Invalid JSON body' }, { status: 400 })
  }

  if (
    !Array.isArray(tags) ||
    tags.length === 0 ||
    tags.length > MAX_TAGS ||
    !tags.every((tag) => typeof tag === 'string' && ALLOWED_TAG.test(tag))
  ) {
    return NextResponse.json({ status: 400, message: 'Invalid tags' }, { status: 400 })
  }

  for (const tag of tags as string[]) revalidateTag(tag)

  return NextResponse.json({ status: 200, message: 'Revalidated', data: { tags } })
}
