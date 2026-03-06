import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vibe Search — Real-time Word Search Game',
  description: 'Multiplayer word search game with real-time leaderboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>
        <div className="noise-overlay" />
        <div className="scanlines" />
        {children}
      </body>
    </html>
  )
}
