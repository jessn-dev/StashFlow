'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function AddLoanButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
      >
        Add Loan
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 10.94L2.53 5.47l1.06-1.06L8 8.82l4.41-4.41 1.06 1.06L8 10.94z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-20">
          <button
            onClick={() => { setOpen(false); router.push('/dashboard/loans/upload'); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <span className="text-base">📄</span>
            <div className="text-left">
              <p className="font-medium">Upload Document</p>
              <p className="text-[11px] text-gray-400">Recommended</p>
            </div>
          </button>
          <button
            onClick={() => { setOpen(false); router.push('/dashboard/loans/new'); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="text-base">✏️</span>
            <p className="font-medium">Enter Manually</p>
          </button>
        </div>
      )}
    </div>
  );
}
