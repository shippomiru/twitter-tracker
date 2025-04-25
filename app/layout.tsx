import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { MainNav } from '@/components/main-nav';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  fallback: ['system-ui', 'arial'],
  preload: true,
  adjustFontFallback: true
});

export const metadata: Metadata = {
  title: 'Flashtweet - Real-Time Twitter Monitoring with AI Translation & Alerts',
  description: 'Flashtweet uses AI to monitor Twitter accounts in real-time, providing instant alerts via email or phone. Get auto-translated tweets and never miss important updates.',
  metadataBase: new URL('https://flashtweet.online'),
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex min-h-screen flex-col">
            <MainNav />
            <main className="flex-1">{children}</main>
            <footer className="border-t py-6 md:py-0">
              <div className="flex h-16 items-center justify-center w-full text-center">
                <p className="text-sm text-muted-foreground">
                  &copy; 2025 FlashTweet. All rights reserved.
                </p>
              </div>
            </footer>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}