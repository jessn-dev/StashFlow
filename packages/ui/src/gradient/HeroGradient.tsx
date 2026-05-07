import React from 'react';

export function HeroGradient() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Blob 1 */}
      <div className="gradient-blob blob1" />

      {/* Blob 2 */}
      <div className="gradient-blob blob2" />

      {/* Blob 3 */}
      <div className="gradient-blob blob3" />

      {/* Optional overlay for readability */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[40px]" />
    </div>
  );
}
