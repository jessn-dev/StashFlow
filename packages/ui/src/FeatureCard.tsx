import React from 'react';

type FeatureCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function FeatureCard({
  title,
  description,
  children,
}: FeatureCardProps) {
  return (
    <div className="rounded-[20px] border border-[#F1F5F9] bg-white p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-6 h-48 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center border border-gray-100/50">
        {children}
      </div>

      <h4 className="text-xl font-bold text-[#0A2540] tracking-tight">{title}</h4>
      <p className="mt-3 text-sm text-[#4B5563] leading-relaxed font-bold">{description}</p>
    </div>
  );
}
