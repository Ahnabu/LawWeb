const isProduction = process.env.NODE_ENV === 'production'

if (isProduction && !process.env.NEXT_PUBLIC_API_URL) {
  console.error(
    'CRITICAL: NEXT_PUBLIC_API_URL environment variable is not set in production. ' +
    'The application will not be able to connect to the backend. ' +
    'Please set NEXT_PUBLIC_API_URL in your Vercel environment variables.'
  )
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000'
