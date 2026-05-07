import { Asset, formatCurrency } from '@stashflow/core';
import { Wallet, Landmark, Home, Briefcase, HelpCircle } from 'lucide-react';

const TYPE_ICONS = {
  cash: Wallet,
  investment: Briefcase,
  property: Home,
  retirement: Landmark,
  other: HelpCircle,
};

export function AssetCard({ asset }: { asset: Asset }) {
  const Icon = TYPE_ICONS[asset.type] || HelpCircle;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
          <Icon size={24} />
        </div>
        <div>
          <p className="font-bold text-gray-900">{asset.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {asset.institution ? `${asset.institution} · ` : ''}
            <span className="capitalize">{asset.type}</span>
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-black text-gray-900">{formatCurrency(asset.balance, asset.currency)}</p>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{asset.currency}</p>
      </div>
    </div>
  );
}
