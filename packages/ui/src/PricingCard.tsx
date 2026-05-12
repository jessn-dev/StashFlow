import React from 'react';

type PricingCardProps = {
  tier: string;
  price: string;
  description: string;
  features: string[];
  buttonText: string;
  highlighted?: boolean;
};

export function PricingCard({
  tier,
  price,
  description,
  features,
  buttonText,
  highlighted = false,
}: PricingCardProps) {
  return (
    <div className={`rounded-[24px] p-8 border transition-all duration-300 flex flex-col h-full ${
      highlighted 
        ? 'bg-[#0A2540] border-[#0A2540] text-white shadow-xl shadow-indigo-100 scale-105 z-10' 
        : 'bg-white border-[#F1F5F9] text-[#0A2540] hover:shadow-lg'
    }`}>
      <div className="mb-8">
        <p className={`text-xs font-black uppercase tracking-[0.2em] mb-4 ${highlighted ? 'text-indigo-400' : 'text-indigo-600'}`}>
          {tier}
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black tracking-tighter">{price}</span>
          {price !== 'Free' && <span className={`text-sm font-bold ${highlighted ? 'text-gray-300' : 'text-[#4B5563]'}`}>/month</span>}
        </div>
        <p className={`mt-4 text-sm font-bold leading-relaxed ${highlighted ? 'text-gray-200' : 'text-[#4B5563]'}`}>
          {description}
        </p>
      </div>

      <ul className="space-y-4 mb-10 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              highlighted ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
            }`}>
              ✓
            </span>
            <span className="text-sm font-bold opacity-100">{feature}</span>
          </li>
        ))}
      </ul>

      <button className={`w-full py-4 rounded-xl text-sm font-black transition-all active:scale-95 ${
        highlighted 
          ? 'bg-white text-[#0A2540] hover:bg-gray-100' 
          : 'bg-[#0A2540] text-white hover:bg-[#0A2540]/90'
      }`}>
        {buttonText}
      </button>
    </div>
  );
}
