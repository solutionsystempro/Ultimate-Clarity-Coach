import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'Ultimate Business Clarity Coach',
  description: 'Elite AI business coaching powered by $30,000 worth of proven frameworks. Get clear, get focused, get paid.',
  openGraph: {
    title: 'Ultimate Business Clarity Coach',
    description: 'Elite AI business coaching — get the clarity that took others $30,000 to find.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
        <body className="font-sans antialiased bg-[#08080B] text-[#EFEFEF]">
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: { 
                background: '#0F0F14', 
                color: '#EFEFEF', 
                border: '1px solid #1F1F28',
                fontSize: '13px'
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  )
}
