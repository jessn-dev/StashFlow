'use client';

import { useState } from 'react';
import { Asset, formatCurrency } from '@stashflow/core';
import { Wallet, Landmark, Home, Briefcase, HelpCircle, Edit2, Trash2, Loader2 } from 'lucide-react';
import { AssetDrawer } from './AssetDrawer';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const TYPE_ICONS = {
  cash: Wallet,
  investment: Briefcase,
  property: Home,
  retirement: Landmark,
  other: HelpCircle,
};

export function AssetCard({ asset }: { asset: Asset }) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const Icon = TYPE_ICONS[asset.type] || HelpCircle;

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('assets').delete().eq('id', asset.id);
    
    if (error) {
      console.error('Failed to delete asset:', error);
      setIsDeleting(false);
      setConfirmDelete(false);
    } else {
      router.refresh();
    }
  };

  return (
    <>
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 group relative">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-gray-100 transition-colors">
            <Icon size={28} />
          </div>
          <div>
            <p className="font-black text-gray-900 leading-tight">{asset.name}</p>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
              {asset.institution ? `${asset.institution} · ` : ''}
              {asset.type}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xl font-black text-gray-900 tracking-tight">{formatCurrency(asset.balance, asset.currency)}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{asset.currency}</p>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsEditOpen(true)}
              className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
              title="Edit asset"
            >
              <Edit2 size={16} strokeWidth={2.5} />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={`p-2.5 rounded-xl transition-all ${
                confirmDelete 
                  ? 'bg-red-50 text-red-500 hover:bg-red-100' 
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              }`}
              title={confirmDelete ? 'Click to confirm' : 'Delete asset'}
            >
              {isDeleting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>

        {confirmDelete && (
          <div className="absolute inset-0 bg-white/95 rounded-3xl flex items-center justify-center gap-4 px-6 z-10 animate-in fade-in zoom-in-95 duration-200">
            <p className="text-sm font-bold text-gray-900">Delete this asset?</p>
            <div className="flex gap-2">
              <button 
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-100"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      <AssetDrawer
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        initialData={asset}
      />
    </>
  );
}
