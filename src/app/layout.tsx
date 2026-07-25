import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastContainer } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'Rummikub Online',
  description: 'Play Rummikub with friends in real time — free, no download required.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F172A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-app-bg text-slate-100 antialiased">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
