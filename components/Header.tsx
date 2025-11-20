'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();
  const showImportButton = pathname === '/mistakes' || pathname === '/' || pathname === '/insights';

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/mistakes" className="text-2xl font-bold text-gray-900 hover:text-gray-700">
              Go Mistake Journal
            </Link>
            <nav className="flex gap-6">
              <Link
                href="/mistakes"
                className={`text-sm font-medium transition ${
                  pathname === '/mistakes' || pathname === '/'
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mistakes
              </Link>
              <Link
                href="/insights"
                className={`text-sm font-medium transition ${
                  pathname === '/insights' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Insights
              </Link>
            </nav>
          </div>
          {showImportButton && (
            <Link
              href="/games/new"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Import Game
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
