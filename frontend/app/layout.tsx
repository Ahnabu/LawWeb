import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Islam & Associates | Dhaka Law Firm',
  description: 'Islam & Associates is a leading law firm in Dhaka, Bangladesh offering corporate, civil, criminal and immigration legal services since 1997.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
