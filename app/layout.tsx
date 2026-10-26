import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { AppStoreProvider } from '@/lib/store'
import { I18nProvider, i18nBootScript } from '@/lib/i18n'
import './globals.css'

const _plexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })
const _plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'] })

export const metadata: Metadata = {
  title: 'Company Operations Hub',
  description: 'One operating record for your company: structure, people, work, approvals, products, finance and private AI answers. Interactive prototype with synthetic data.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f8f9fb',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: i18nBootScript }} />
      </head>
      <body className="font-sans antialiased">
        <I18nProvider>
          <AppStoreProvider>{children}</AppStoreProvider>
          <Toaster position="bottom-right" />
        </I18nProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
