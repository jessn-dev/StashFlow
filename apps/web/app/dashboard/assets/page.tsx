import { createClient } from '@/lib/supabase/server';
import { AssetQuery } from '@stashflow/api';
import { formatCurrency, convertToBase } from '@stashflow/core';
import { AssetCard } from '@/modules/assets/components/AssetCard';
import { Wallet, Plus } from 'lucide-react';
import Link from 'next/link';

export default async function AssetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const assetQuery = new AssetQuery(supabase);
  const assets = await assetQuery.getAll(user.id);
  
  const { data: profile } = await supabase.from('profiles').select('preferred_currency').eq('id', user.id).single();
  const currency = profile?.preferred_currency || 'USD';

  // Fetch latest rates for total calculation
  const { data: ratesData } = await supabase.from('exchange_rates').select('target, rate');
  const rates: Record<string, number> = {};
  ratesData?.forEach(r => rates[r.target] = r.rate);
  rates['USD'] = 1; // Base internal

  const totalAssets = assets.reduce((sum, a) => {
    const rate = rates[a.currency] || 1;
    return sum + convertToBase(a.balance, rate);
  }, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Assets</h1>
          <p className="text-gray-400 font-medium mt-1">Manage your holdings and track your wealth.</p>
        </div>
        <button 
          disabled
          title="Coming soon"
          className="flex items-center gap-2 px-5 h-12 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all opacity-50 cursor-not-allowed"
        >
          <Plus size={18} />
          Add Asset
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-gray-900 rounded-[32px] p-10 text-white overflow-hidden relative shadow-2xl shadow-gray-900/20">
        <div className="relative z-10">
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Total Combined Assets</p>
          <div className="flex items-baseline gap-3">
             <h2 className="text-5xl font-black tracking-tighter">{formatCurrency(totalAssets, currency)}</h2>
             <span className="text-xl font-bold text-gray-500">{currency}</span>
          </div>
        </div>
        
        {/* Subtle decorative elements */}
        <div className="absolute top-0 right-0 p-12 opacity-10">
           <Wallet size={120} />
        </div>
      </div>

      {/* Asset List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Your Holdings ({assets.length})</h3>
        </div>

        {assets.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[32px] p-16 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-gray-300 shadow-sm mb-6">
               <Plus size={32} />
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-1">No assets tracked yet</h4>
            <p className="text-sm text-gray-400 max-w-[240px] font-medium leading-relaxed">
              Add your bank accounts, investments, or property to see your full net worth.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assets.map(asset => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
