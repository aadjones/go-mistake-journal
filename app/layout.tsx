import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'Go Mistake Journal',
  description: 'Track and analyze your Go mistakes to improve faster',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
