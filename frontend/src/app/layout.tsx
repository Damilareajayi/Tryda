import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  metadataBase: new URL('https://tryda-ai.web.app'),
  title: 'Tryda | AI Chatbot Reliability & Drift Monitoring Platform',
  description: 'Monitor and audit your AI customer support chatbots in real time. Catch hallucinations, prevent costly pricing and refund policy breaches, and ensure 100% brand reliability on Crisp, Intercom, and custom widgets.',
  keywords: [
    'AI chatbot audit',
    'chatbot reliability monitoring',
    'LLM drift detection',
    'customer support AI testing',
    'prevent chatbot refund policy breaches',
    'Crisp chatbot monitor',
    'Intercom AI audit tool',
    'B2B AI guardrails'
  ],
  alternates: {
    canonical: 'https://tryda.io'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/brand/tryda-favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/tryda-favicon.png', sizes: '64x64', type: 'image/png' },
    ],
    apple: { url: '/brand/tryda-favicon-512.png', sizes: '512x512', type: 'image/png' },
    shortcut: '/brand/tryda-favicon.svg',
  },
  openGraph: {
    title: 'Tryda | AI Chatbot Reliability & Drift Monitoring Platform',
    description: 'Monitor and audit your AI customer support chatbots in real time. Catch hallucinations, prevent costly policy breaches, and ensure 100% brand reliability.',
    url: 'https://tryda.io',
    siteName: 'Tryda',
    images: [{ url: '/brand/tryda-horizontal-dark.png', width: 840, height: 240 }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tryda | AI Chatbot Reliability & Drift Monitoring Platform',
    description: 'Monitor and audit your AI customer support chatbots in real time. Catch hallucinations, prevent costly policy breaches, and ensure 100% brand reliability.',
    images: ['/brand/tryda-horizontal-dark.png'],
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-navy-900 text-gray-100 font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
