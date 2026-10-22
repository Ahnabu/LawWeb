import { API_BASE_URL } from './api'

// ── Public lawyer profiles (server) ───────────────────────────────────────────
// Used for profile metadata, structured data and the sitemap. The profile page
// itself still loads its details (and live availability) in the browser.

export interface PublicLawyerUser {
  _id: string
  name: string
  specialization?: string
}

export interface PublicLawyerProfile {
  designation?: { en?: string; bn?: string }
  bio?: { en?: string; bn?: string }
  profileImageUrl?: string
  practiceAreas?: string[]
  languages?: string[]
  education?: { degree: string; institution: string; year?: number }[]
  yearAdmitted?: number
}

const LAWYER_REVALIDATE_SECONDS = 300

/** A verified, unblocked lawyer, or null for an unknown or invalid id */
export async function getPublicLawyer(
  id: string,
): Promise<{ user: PublicLawyerUser; profile: PublicLawyerProfile | null } | null> {
  const res = await fetch(`${API_BASE_URL}/api/lawyers/${encodeURIComponent(id)}`, {
    next: { revalidate: LAWYER_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(5000),
  })
  // 400: not an ObjectId or not a lawyer; 404: unknown or blocked
  if (res.status === 400 || res.status === 404) return null
  if (!res.ok) throw new Error(`Lawyer request failed with ${res.status}`)
  const body = (await res.json()) as { lawyer?: PublicLawyerUser; profile?: PublicLawyerProfile | null }
  return body.lawyer ? { user: body.lawyer, profile: body.profile ?? null } : null
}

/** Ids of the lawyers listed on /lawyers, for the sitemap; empty on failure */
export async function getPublicLawyerIds(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/lawyers/public`, {
      next: { revalidate: LAWYER_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const body = (await res.json()) as { lawyers?: { _id?: string }[] }
    return (body.lawyers ?? []).flatMap((lawyer) => (lawyer._id ? [lawyer._id] : []))
  } catch {
    return []
  }
}
