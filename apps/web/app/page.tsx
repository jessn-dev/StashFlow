'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FeatureCard, PricingCard } from '@stashflow/ui';

// Vivid Liquid Prism Background (No obscuring blur)
function HeroBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Skewed Container for natural slanted effect */}
      <div 
        className="absolute top-[-20%] right-[-10%] w-[120%] h-[120%] bg-white origin-top-right -skew-y-12 overflow-hidden"
      >
        {/* Prismatic Mesh - Highly Visible */}
        <div className="absolute inset-0 opacity-80 mix-blend-multiply">
          {/* Prismatic Blob 1: Deep Indigo */}
          <motion.div
            animate={{
              x: [0, 100, -50, 0],
              y: [0, -80, 120, 0],
              scale: [1, 1.3, 0.8, 1],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[10%] right-[10%] w-[60vw] h-[60vw] rounded-full bg-indigo-400 blur-[80px] will-change-transform"
          />

          {/* Prismatic Blob 2: Vibrant Rose */}
          <motion.div
            animate={{
              x: [0, -120, 100, 0],
              y: [0, 150, -80, 0],
              scale: [1, 0.7, 1.4, 1],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[20%] right-[-5%] w-[70vw] h-[70vw] rounded-full bg-rose-400 blur-[90px] will-change-transform"
          />

          {/* Prismatic Blob 3: Bright Emerald */}
          <motion.div
            animate={{
              x: [0, 80, -150, 0],
              y: [0, 200, -100, 0],
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[30%] right-[20%] w-[50vw] h-[50vw] rounded-full bg-emerald-400 blur-[70px] will-change-transform"
          />

          {/* Prismatic Blob 4: Electric Cyan */}
          <motion.div
            animate={{
              x: [0, -100, 150, 0],
              y: [0, -150, 100, 0],
            }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            className="absolute middle-0 right-[30%] w-[40vw] h-[40vw] rounded-full bg-cyan-400 blur-[60px] will-change-transform"
          />
        </div>

        {/* Subtle Noise for texture */}
        <div className="absolute inset-0 opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>
    </div>
  );
}

const revealVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.8, 
      ease: [0.16, 1, 0.3, 1] 
    }
  }
};

export default function HomePage() {
  const [notif, setNotif] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: '',
    message: ''
  });

  const triggerNotif = (title: string, message: string) => {
    setNotif({ show: true, title, message });
    setTimeout(() => setNotif(prev => ({ ...prev, show: false })), 5000);
  };

  return (
    <main className="relative min-h-screen selection:bg-indigo-100 selection:text-indigo-900 scroll-smooth overflow-x-hidden">
      
      {/* Header & Hero Wrapper */}
      <div className="relative">
        <HeroBackground />
        
        <header className="sticky top-0 z-50 w-full transition-all duration-300 hover:bg-white hover:shadow-sm border-b border-transparent hover:border-gray-100 group/nav">
          <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-2.5 group cursor-pointer">
              <div className="w-8 h-8 bg-[#0A2540] rounded-lg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <span className="text-white font-black text-lg">S</span>
              </div>
              <span className="font-bold text-lg tracking-tighter text-[#0A2540]">StashFlow</span>
            </div>
            <nav className="hidden md:flex items-center gap-10 text-[13px] font-bold text-[#0A2540] uppercase tracking-widest">
              <Link href="#features" className="hover:opacity-70 transition-opacity">Features</Link>
              <Link href="#pricing" className="hover:opacity-70 transition-opacity">Pricing</Link>
              <Link href="#roadmap" className="hover:opacity-70 transition-opacity">Roadmap</Link>
            </nav>
            <div className="flex items-center gap-3">
              <Link 
                href="/login" 
                className="px-5 py-2.5 bg-[#0A2540] text-white rounded-full text-[13px] font-bold shadow-md hover:shadow-[#0A2540]/20 hover:-translate-y-0.5 transition-all"
              >
                Sign in
              </Link>
              <button 
                onClick={() => triggerNotif("Scaling in progress!", "We're building our support team. This feature will be live shortly after our MVP launch.")}
                className="px-5 py-2.5 bg-[#0A2540] text-white rounded-full text-[13px] font-bold shadow-md hover:shadow-[#0A2540]/20 hover:-translate-y-0.5 transition-all"
              >
                Contact Us
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <motion.section 
          initial="hidden"
          animate="visible"
          variants={revealVariants}
          className="relative z-10 max-w-[1200px] mx-auto px-6 pt-20 md:pt-32 pb-32 md:pb-48"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-center">
            <div className="lg:col-span-6 max-w-[520px]">
              <h1 className="text-[56px] lg:text-[64px] font-bold text-[#0A2540] leading-[1.05] tracking-[-0.015em]">Your global money, <br/>finally in sync.</h1>
              <p className="mt-6 text-[18px] leading-[1.6] text-[#0A2540] font-medium opacity-90">
                Track income, expenses, and debt across USD, PHP, and SGD—with real financial rules applied automatically.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link href="/signup" className="h-12 px-7 bg-[#0A2540] text-white rounded-full flex items-center justify-center font-semibold shadow-lg shadow-[#0A2540]/20 hover:bg-[#0A2540]/90 transition-colors">Start tracking for free</Link>
                <button className="h-12 px-7 bg-white border border-[#E5E7EB] text-[#0A2540] rounded-full flex items-center justify-center font-semibold hover:border-gray-300 transition-colors shadow-sm" onClick={() => triggerNotif("Mobile Early Access", "We're currently polishing the iOS & Android experience. You'll be the first to know when we launch!")}>Get Mobile App Early Access</button>
              </div>
              <p className="mt-6 text-[14px] font-black text-[#0A2540]/60 uppercase tracking-wide">
                Built for expats, remote workers, and global investors.
              </p>

            </div>

            <div className="lg:col-span-6 relative">
              <div className="relative w-full aspect-square max-w-[500px] mx-auto lg:ml-auto">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] lg:w-[320px] bg-gray-900 rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.15)] border-[6px] border-gray-800 rotate-2 overflow-hidden z-20 transition-transform duration-500 hover:rotate-0">
                  <div className="p-4 h-full flex flex-col bg-white">
                    <div className="w-10 h-10 rounded-full bg-gray-100 mb-6" />
                    <div className="space-y-4">
                      <div className="h-4 bg-gray-100 rounded w-1/3" />
                      <div className="h-10 bg-gray-900 rounded-xl w-full" />
                      <div className="h-32 bg-indigo-50 rounded-2xl w-full border border-indigo-100" />
                      <div className="space-y-2 mt-auto">
                        <div className="h-10 bg-gray-50 rounded-lg" />
                        <div className="h-10 bg-gray-50 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>

                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-[5%] right-0 lg:-right-4 bg-white rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-30"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🍽</span>
                    <div>
                      <p className="text-[11px] font-bold text-[#0A2540]">Dining up 18%</p>
                      <p className="text-[10px] text-[#4B5563] font-bold">vs last month</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ x: [-5, 5, -5] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-[40%] -left-4 lg:-left-12 bg-white rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-30"
                >
                  <div className="text-[12px] font-black text-[#0A2540] tracking-tighter">
                    <span className="text-green-600">+$2,400 USD</span>
                    <span className="mx-2 text-[#CBD5E1]">→</span>
                    <span className="text-indigo-600">₱134,000 PHP</span>
                  </div>
                </motion.div>

                <div className="absolute bottom-[10%] -left-2 lg:-left-8 bg-white rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-30 transition-transform duration-300 hover:scale-105">
                  <p className="text-[10px] font-bold text-[#4B5563] uppercase tracking-widest mb-1">Emergency Fund</p>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-sm font-black text-[#0A2540]">$12,000</p>
                    <p className="text-[10px] text-[#475569] font-bold">/ $50,000</p>
                  </div>
                  <div className="mt-2 h-1.5 w-32 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '24%' }} />
                  </div>
                </div>

                <div className="absolute bottom-[15%] right-0 lg:-right-4 bg-white rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-30 transition-transform duration-300 hover:scale-105">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-black text-[#0A2540]">DTI: 28%</p>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md font-bold text-center">✅</span>
                  </div>
                  <p className="text-[10px] font-bold text-[#4B5563]">Within US safe range</p>
                </div>

              </div>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Feature Grid */}
      <section id="features" className="relative z-10 pt-20 pb-32 md:pt-32 md:pb-48 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={revealVariants}
            className="max-w-[600px] mb-20 md:mb-32"
          >
            <p className="text-sm font-black uppercase tracking-[0.2em] text-indigo-600 mb-4">Built for your global life</p>
            <h2 className="text-4xl md:text-5xl font-bold text-[#0A2540] leading-tight tracking-tight">Manage money across borders—without the chaos</h2>
            <p className="mt-6 text-lg text-[#4B5563] font-bold">Whether you're earning, sending, or investing, StashFlow keeps everything in sync.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={revealVariants}
              className="space-y-8 md:space-y-12"
            >
              <FeatureCard title="Earn in USD. See your real balance instantly." description="Your income is automatically reflected across currencies so you always know your true financial position.">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-2">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-lg">🇺🇸</div>
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-lg">🇵🇭</div>
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-lg">🇸🇬</div>
                  </div>
                  <p className="text-sm font-black text-green-600">+$2,400.00</p>
                </div>
              </FeatureCard>

              <FeatureCard title="Understand your debt—wherever it lives" description="Loans from different countries are analyzed using the correct financial rules, so you know what’s healthy and what’s not.">
                <div className="w-full px-8">
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Singapore TDSR</span>
                    <span className="text-[10px] font-bold text-rose-500">Limit: 55%</span>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-rose-400" style={{ width: '52%' }} />
                  </div>
                  <p className="mt-2 text-center text-xs font-bold text-[#0A2540]">Warning: Near Threshold</p>
                </div>
              </FeatureCard>

              <FeatureCard title="Upload documents. Get instant insights." description="Just upload your loan or statement and StashFlow builds your repayment plan automatically.">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-20 bg-white border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-300">📄</div>
                  <div className="w-4 h-4 text-gray-300">→</div>
                  <div className="space-y-2">
                    <div className="h-2 w-24 bg-indigo-100 rounded" />
                    <div className="h-2 w-16 bg-gray-100 rounded" />
                    <div className="h-2 w-20 bg-gray-100 rounded" />
                  </div>
                </div>
              </FeatureCard>
            </motion.div>

            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={revealVariants}
              className="space-y-8 md:space-y-12 md:mt-24"
            >
              <FeatureCard title="Budget smarter with category-level tracking" description="Set limits for different expense types and see exactly where your money is going across all your accounts.">
                <div className="w-full px-8 space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-gray-400 uppercase">Dining Out</span>
                      <span className="text-[#0A2540]">$450 / $600</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: '75%' }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-gray-400 uppercase">Shopping</span>
                      <span className="text-[#0A2540]">$820 / $800</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-400" style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>
              </FeatureCard>
              <FeatureCard title="All your finances in one timeline" description="Income, expenses, transfers, and loan payments—combined into a single, easy-to-follow view.">
                <div className="space-y-3 w-full px-6">
                  <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                    <div className="w-6 h-6 bg-green-50 text-green-600 text-[10px] flex items-center justify-center rounded-md font-bold">↓</div>
                    <div className="h-2 w-20 bg-gray-100 rounded" />
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 shadow-sm ml-4">
                    <div className="w-6 h-6 bg-red-50 text-red-600 text-[10px] flex items-center justify-center rounded-md font-bold">↑</div>
                    <div className="h-2 w-16 bg-gray-100 rounded" />
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                    <div className="w-6 h-6 bg-indigo-50 text-indigo-600 text-[10px] flex items-center justify-center rounded-md font-bold">↔</div>
                    <div className="h-2 w-24 bg-gray-100 rounded" />
                  </div>
                </div>
              </FeatureCard>

              <FeatureCard title="Set goals across currencies" description="Save and plan with full awareness of how currency differences affect your progress.">
                <div className="w-full px-12">
                  <div className="relative w-20 h-20 mx-auto">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="226" strokeDashoffset="56.5" className="text-indigo-500" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[#0A2540]">75%</div>
                  </div>
                  <p className="mt-2 text-center text-[10px] font-bold text-gray-400">Dream Home (PH)</p>
                </div>
              </FeatureCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <motion.section 
        id="pricing" 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={revealVariants}
        className="relative z-10 py-32 md:py-48 bg-gray-50/50 backdrop-blur-sm"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20 md:mb-32">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-indigo-600 mb-4">Pricing</p>
            <h2 className="text-4xl md:text-5xl font-bold text-[#0A2540] leading-tight tracking-tight">Simple, transparent pricing</h2>
            <p className="mt-6 text-lg text-[#4B5563] font-bold leading-relaxed">Start for free and upgrade as your global life grows. No hidden fees, no complexity.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
            <PricingCard tier="Free Tier" price="Free" description="Perfect for individuals just starting their global financial journey." features={["Basic transaction tracking", "Unlimited income/expenses", "Regional DTI health checks", "Community support"]} buttonText="Get started for free" />
            <PricingCard tier="StashFlow Pro" highlighted price="$9.99" description="Unlock the full power of automated regional strategy for total financial awareness." features={["Unlimited Automated Document Extraction", "Advanced DTI Simulators", "Automated Budget Rollovers", "Priority Support", "Multi-device Sync"]} buttonText="Start free trial" />
          </div>

          <div className="mt-20 text-center">
            <p className="text-sm text-[#4B5563] font-bold">Join our growing community of early adopters simplifying their global finances.</p>
          </div>
        </div>
      </motion.section>

      {/* Roadmap Section */}
      <motion.section 
        id="roadmap" 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={revealVariants}
        className="relative z-10 py-32 md:py-48 bg-white"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-indigo-600 mb-4">Product Roadmap</p>
            <h2 className="text-4xl md:text-5xl font-bold text-[#0A2540] leading-tight tracking-tight">See what’s ahead</h2>
            <p className="mt-6 text-lg text-[#4B5563] font-bold">
              Active and shipped features across the StashFlow ecosystem.
            </p>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-[#0A2540] flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                Shipped
              </h3>
              <div className="space-y-4">
                {["Multi-currency Transaction Tracking", "Automated Loan Data Extraction", "Regional DTI Health Checks (SG, PH, US)", "Global Net Worth Visualization"].map((item, i) => (
                  <div key={i} className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-900">{item}</div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold text-[#0A2540] flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                Active Development
              </h3>
              <div className="space-y-4">
                {["Mobile App (iOS & Android) Early Access", "Automated Bank Sync (Plaid/Salt Edge)", "Predictive Cash Flow Analysis", "Advanced Savings Goal Automations"].map((item, i) => (
                  <div key={i} className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl text-sm font-bold text-indigo-900">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Contact Section */}
      <motion.section 
        id="contact" 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={revealVariants}
        className="relative z-10 py-32 bg-[#0A2540]"
      >
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Have questions?</h2>
          <p className="text-white/80 text-lg mb-10 font-bold">We're here to help you navigate your global finances.</p>
          <div className="relative inline-block group">
            <button className="px-8 py-4 bg-white text-[#0A2540] rounded-full font-bold shadow-xl hover:-translate-y-1 transition-all" onClick={() => triggerNotif("Scaling in progress!", "We're building our support team. This feature will be live shortly after our MVP launch.")}>Contact Support</button>
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-3 rounded-md font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Post-MVP Feature</div>
          </div>
        </div>
      </motion.section>

      {/* Toast Notification */}
      <AnimatePresence>
        {notif.show && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-8 right-8 z-[100]"
          >
            <div className="bg-[#0A2540] text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 max-w-sm">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-xl">🚀</div>
              <div>
                <p className="font-bold text-sm">{notif.title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{notif.message}</p>
              </div>
              <button onClick={() => setNotif(prev => ({ ...prev, show: false }))} className="text-gray-500 hover:text-white transition-colors">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="relative z-10 py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold text-[#0A2540] mb-2">Ready to sync your global life?</h3>
            <p className="text-[#4B5563] font-bold">Join thousands of others managing money across borders.</p>
          </div>
          <div className="flex gap-4">
            <Link href="/signup" className="h-12 px-8 bg-[#0A2540] text-white rounded-full flex items-center justify-center font-bold shadow-lg shadow-[#0A2540]/10 hover:-translate-y-0.5 transition-all">Start tracking now</Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 flex justify-between items-center border-t border-gray-100">
          <p className="text-xs text-[#0A2540]/60 font-bold uppercase tracking-widest">© 2026 StashFlow Inc.</p>
          <div className="flex gap-8 text-xs text-[#0A2540]/60 font-bold uppercase tracking-widest">
            <Link href="#roadmap" className="hover:text-gray-900 transition-colors">Roadmap</Link>
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
