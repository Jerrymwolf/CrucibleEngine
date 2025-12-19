import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
    { media: '(prefers-color-scheme: light)', color: '#0ea5e9' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'The Values Crucible',
    template: '%s | Values Crucible',
  },
  description: 'AI-powered crisis simulation for leadership development. Practice enacting values under pressure.',
  keywords: ['leadership development', 'crisis simulation', 'AI training', 'values-based leadership'],
  authors: [{ name: 'Jerry Wolf' }],
  creator: 'ValuesCrucible',
  publisher: 'ValuesCrucible',

  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },

  manifest: '/manifest.webmanifest',

  openGraph: {
    type: 'website',
    siteName: 'The Values Crucible',
    title: 'The Values Crucible',
    description: 'AI-powered crisis simulation for leadership development',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'The Values Crucible - AI Crisis Simulation',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'The Values Crucible',
    description: 'AI-powered crisis simulation for leadership development',
    images: ['/og-image.png'],
  },

  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'The Values Crucible',
  description: 'AI-powered crisis simulation for leadership development',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  author: {
    '@type': 'Person',
    name: 'Jerry Wolf',
  },
};

// Clerk appearance configuration
const clerkAppearance = {
  baseTheme: undefined, // Uses dark mode from html class
  variables: {
    colorPrimary: '#0ea5e9', // sky-500
    colorBackground: '#0f172a', // slate-900
    colorInputBackground: '#1e293b', // slate-800
    colorInputText: '#f8fafc', // slate-50
  },
  elements: {
    card: 'bg-slate-900 border-slate-700',
    headerTitle: 'text-slate-100',
    headerSubtitle: 'text-slate-400',
    socialButtonsBlockButton: 'bg-slate-800 border-slate-700 hover:bg-slate-700',
    formButtonPrimary: 'bg-sky-500 hover:bg-sky-600',
    footerActionLink: 'text-sky-400 hover:text-sky-300',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const content = (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            classNames: {
              toast: 'bg-card border-border',
              title: 'text-foreground',
              description: 'text-muted-foreground',
              success: 'bg-status-safe/10 border-status-safe/50',
              error: 'bg-destructive/10 border-destructive/50',
            },
          }}
        />
      </body>
    </html>
  );

  // Only wrap with ClerkProvider if key is available (skip during static build)
  if (hasClerkKey) {
    return (
      <ClerkProvider appearance={clerkAppearance}>
        {content}
      </ClerkProvider>
    );
  }

  return content;
}
