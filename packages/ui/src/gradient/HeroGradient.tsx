'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function HeroGradient() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none bg-[#F9FAFB]">
      {/* Mesh Gradient Container */}
      <div className="absolute inset-0 opacity-60">
        
        {/* Blob 1: Indigo - Top Right */}
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-20 -right-20 w-[800px] h-[800px] rounded-full bg-indigo-400/30 blur-[100px] will-change-transform mix-blend-multiply"
        />

        {/* Blob 2: Emerald - Bottom Left */}
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 100, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-40 -left-20 w-[900px] h-[900px] rounded-full bg-emerald-300/30 blur-[110px] will-change-transform mix-blend-multiply"
        />

        {/* Blob 3: Sky Blue - Center Left */}
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, -150, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-[20%] -left-20 w-[600px] h-[600px] rounded-full bg-sky-300/20 blur-[90px] will-change-transform mix-blend-multiply"
        />

        {/* Blob 4: Soft Purple - Bottom Right */}
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-0 right-[10%] w-[700px] h-[700px] rounded-full bg-violet-300/20 blur-[100px] will-change-transform mix-blend-multiply"
        />
      </div>

      {/* Final subtle overlay to tie it together without obscuring */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-[40px]" />
    </div>
  );
}
