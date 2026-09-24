import './globals.css'
import { LanguageProvider } from '../components/LanguageProvider'
import { ContentProvider } from '../components/ContentProvider'
import { ThemeProvider } from '../components/ThemeProvider'
import { AuthProvider } from '../components/AuthProvider'
import { SonnerToaster } from '../components/SonnerToaster'
import { getPublishedContent } from '../lib/content'
import { getPageMetadata } from '../lib/seo'

// Home page SEO, also the default for pages without their own
export const generateMetadata = () => getPageMetadata('home')

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const content = await getPublishedContent()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
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
