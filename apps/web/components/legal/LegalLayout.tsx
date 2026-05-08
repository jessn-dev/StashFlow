import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft size={16} strokeWidth={3} />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#0A2540] rounded flex items-center justify-center">
               <span className="text-white font-black text-xs">S</span>
            </div>
            <span className="font-bold text-sm tracking-tighter text-[#0A2540]">StashFlow</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 md:p-16">
          <div className="mb-12">
            <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-4">{title}</h1>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Last Updated: {lastUpdated}</p>
          </div>
          
          <div className="space-y-8 text-gray-600 leading-relaxed max-w-none">
            {children}
          </div>
        </div>

        <footer className="mt-12 text-center text-xs text-gray-400 font-medium">
          <p>© 2026 StashFlow Inc. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
