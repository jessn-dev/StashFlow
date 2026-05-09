'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AssetDrawer } from './AssetDrawer';

export function AssetPageActions() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-5 h-12 bg-gray-900 text-white rounded-xl font-black text-sm hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
      >
        <Plus size={18} strokeWidth={3} />
        Add Asset
      </button>

      <AssetDrawer 
        open={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}
