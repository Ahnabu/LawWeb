import './globals.css'
import { LanguageProvider } from '../components/LanguageProvider'
import { ContentProvider } from '../components/ContentProvider'
import { ThemeProvider } from '../components/ThemeProvider'
import { AuthProvider } from '../components/AuthProvider'
import { SonnerToaster } from '../components/SonnerToaster'
import { getPublishedContent } from '../lib/content'
import { getPageMetadata } from '../lib/seo'
import { getSiteUrl } from '../lib/locale'

// Home page SEO text as the default for pages without their own. Canonical and
// hreflang tags are set per page (see lib/seo.ts), never here.
export async function generateMetadata() {
  return { metadataBase: new URL(getSiteUrl()), ...(await getPageMetadata('home')) }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const content = await getPublishedContent()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Set lang="bn" on /bn pages before paint (the layout is shared, so the
            server HTML says "en"), and prevent a flash of the wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const p = location.pathname;
                if (p === '/bn' || p.indexOf('/bn/') === 0) document.documentElement.lang = 'bn';
              } catch (e) {}
              try {
                const t = localStorage.getItem('lawweb-theme');
                const d = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (t === 'dark' || (!t && d)) document.documentElement.classList.add('dark');
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ContentProvider content={content}>
              <LanguageProvider>{children}</LanguageProvider>
            </ContentProvider>
          </AuthProvider>
          <SonnerToaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
