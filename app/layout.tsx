import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nutrition Planner",
  description: "Plan your meals around the nutrients your goal needs — with the science made explicit.",
  manifest: "/manifest.json",
};

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg width="13" height="16" viewBox="0 0 13 16" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M6.5,0.5 C9.5,2.5 12.5,6.5 11,11.5 C9.5,15 5.5,16 3,14 C0.5,12 1.5,7 4.5,4 C5.5,2.5 5,0.5 6.5,0.5Z"/>
      <path d="M6.5,0.5 L3,14" stroke="white" strokeWidth="0.7" opacity="0.4" fill="none"/>
    </svg>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.className} h-full`}>
      <head>
        <meta name="theme-color" content="#1a4731" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-full bg-white text-gray-900 antialiased">
        <header className="bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <a href="/" className="flex items-center gap-1.5 font-bold text-forest hover:text-fern transition-colors">
              <LeafIcon />
              Nutrition Planner
            </a>
            <a href="/admin" className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 hover:border-gray-300 px-2.5 py-1 rounded-full transition-colors">
              Admin
            </a>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
