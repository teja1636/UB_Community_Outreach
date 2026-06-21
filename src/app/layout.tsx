import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'UB Community',
  description: 'Food · Rides · Sales · Campus life',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#005BBB',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-container">
          <AuthProvider>{children}</AuthProvider>
        </div>
      </body>
    </html>
  )
}
