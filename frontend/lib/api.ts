function resolveApiBaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_API_URL?.trim()

  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        'CRITICAL: NEXT_PUBLIC_API_URL environment variable is not set in production. ' +
        'Please set NEXT_PUBLIC_API_URL in your Vercel project environment variables.'
      )
    }
    return 'http://127.0.0.1:5000'
  }

  // If protocol scheme is missing (e.g. 'islam-associates-backend.vercel.app'),
  // browsers treat it as a relative path under the frontend domain!
  if (!/^https?:\/\//i.test(url)) {
    const isLocal = url.startsWith('localhost') || url.startsWith('127.0.0.1')
    url = isLocal ? `http://${url}` : `https://${url}`
  }

  return url.replace(/\/+$/, '')
}

export const API_BASE_URL = resolveApiBaseUrl()
