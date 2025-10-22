import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OpenHands PR Review Dashboard',
  description: 'Monitor community PRs and review accountability for OpenHands',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  )
}