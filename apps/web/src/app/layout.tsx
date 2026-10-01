import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth/auth-context';

export const metadata: Metadata = {
  title: 'Shop:Sell | High Performance Multi-Vendor Marketplace',
  description:
    'Discover curated products from verified artisanal and enterprise sellers with personalized recommendations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-50">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
