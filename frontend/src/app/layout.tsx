import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'Tryda — AI Reliability Monitoring',
  description: 'Catch AI drift before your customers do.',
  icons: {
    icon: [
      { url: '/brand/tryda-favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/tryda-favicon.png', sizes: '64x64', type: 'image/png' },
    ],
    apple: { url: '/brand/tryda-favicon-512.png', sizes: '512x512', type: 'image/png' },
    shortcut: '/brand/tryda-favicon.svg',
  },
  openGraph: {
    title: 'Tryda — AI Reliability Monitoring',
    description: 'Catch AI drift before your customers do.',
    images: [{ url: '/brand/tryda-horizontal-dark.png', width: 840, height: 240 }],
  },
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
