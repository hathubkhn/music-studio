import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "MusicStudio AI — Turn Ideas into Music, Lyrics & Visuals",
  description:
    "AI creative studio for generating songs, lyrics, music style prompts, images, and video assets from a single idea.",
  keywords: ["AI music", "song generator", "lyrics AI", "music video", "creative studio"],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`} suppressHydrationWarning>
        {children}
        <Toaster
          theme="dark"
          richColors
          position="top-right"
          toastOptions={{
            style: {
              background: "hsl(240 12% 8%)",
              border: "1px solid hsl(240 8% 17%)",
              color: "hsl(0 0% 97%)",
            },
          }}
        />
      </body>
    </html>
  )
}
