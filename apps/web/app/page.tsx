'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { HeroGradient, FeatureCard, PricingCard } from '@stashflow/ui';

export default function HomePage() {
  useEffect(() => {
    // Scroll Reveal Logic
    const observerOptions = {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observer.observe(revealElements[0] === el ? el : el)); // Observe all

    // Initial check for top elements
    revealElements.forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight) {
        el.classList.add('active');
      }
    });

    // Subtle Parallax logic
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const blobs = document.querySelectorAll('.gradient-blob');
      blobs.forEach((blob, i) => {
        const speed = 0.05 * (i + 1);
        (blob as HTMLElement).style.transform = `translateY(${scrolled * speed}px)`;
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <main className="relative min-h-screen selection:bg-indigo-100 selection:text-indigo-900 scroll-smooth">
      {/* Reusable Design Primitive: Stripe-style Gradient */}
      <HeroGradient />

      {/* Navbar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto bg-white/70 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 group cursor-pointer">
          <div className="w-8 h-8 bg-[#0A2540] rounded-lg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
             <span className="text-white font-black text-lg">S</span>
          </div>
          <span className="font-bold text-lg tracking-tighter text-[#0A2540]">StashFlow</span>
        </div>
        <nav className="hidden md:flex items-center gap-10 text-[13px] font-semibold text-gray-500 uppercase tracking-widest">
          <Link href="/dashboard" className="hover:text-[#0A2540] transition-colors">Product</Link>
          <Link href="/dashboard/loans" className="hover:text-[#0A2540] transition-colors">Regional Rules</Link>
          <Link href="/login" className="hover:text-[#0A2540] transition-colors">Pricing</Link>
        </nav>
        <div className="flex items-center gap-4">
           <Link href="/login" className="text-[13px] font-bold text-gray-500 hover:text-[#0A2540] transition-colors">Sign in</Link>
           <Link 
             href="/signup" 
             className="px-5 py-2.5 bg-[#0A2540] text-white rounded-full text-[13px] font-bold shadow-md hover:shadow-[#0A2540]/20 hover:-translate-y-0.5 transition-all"
           >
             Start for free
           </Link>
        </div>
      </header>

      {/* Hero Section: 12-Column Grid */}
      <section className="relative z-10 max-w-[1200px] mx-auto px-6 pt-20 md:pt-32 pb-20 reveal">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-center">
          
          {/* LEFT: Content Block (6 columns) */}
          <div className="lg:col-span-6 max-w-[520px]">
            <h1 className="text-[56px] lg:text-[64px] font-bold text-[#0A2540] leading-[1.05] tracking-[-0.015em]">
              Your global money, <br/>finally in sync.
            </h1>
            <p className="mt-6 text-[18px] leading-[1.6] text-[#6B7280]">
              Track income, expenses, and debt across USD, PHP, and SGD—with real financial rules applied automatically.
            </p>

            {/* CTA Group */}
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link 
                href="/signup" 
                className="h-12 px-7 bg-[#0A2540] text-white rounded-full flex items-center justify-center font-semibold shadow-lg shadow-[#0A2540]/20 hover:bg-[#0A2540]/90 transition-colors"
              >
                Start tracking for free
              </Link>
              <Link 
                href="/login" 
                className="h-12 px-7 bg-white border border-[#E5E7EB] text-[#0A2540] rounded-full flex items-center justify-center font-semibold hover:border-gray-300 transition-colors"
              >
                See how it works →
              </Link>
            </div>

            {/* Trust Line */}
            <p className="mt-6 text-[14px] font-medium text-[#9CA3AF]">
              Built for expats, remote workers, and global investors.
            </p>
          </div>

          {/* RIGHT: Visual System (6 columns) */}
          <div className="lg:col-span-6 relative">
            <div className="relative w-full aspect-square max-w-[500px] mx-auto lg:ml-auto">
              
              {/* Main Device Mockup */}
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

              {/* Smart Card 1: Top Right - AI Insight */}
              <div className="absolute top-[5%] right-0 lg:-right-4 bg-white rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-30 animate-bounce-slow">
                 <div className="flex items-center gap-3">
                    <span className="text-lg">🍽</span>
                    <div>
                       <p className="text-[11px] font-bold text-[#0A2540]">Dining up 18%</p>
                       <p className="text-[10px] text-[#6B7280]">vs last month</p>
                    </div>
                 </div>
              </div>

              {/* Smart Card 2: Mid Left - Currency Flow */}
              <div className="absolute top-[40%] -left-4 lg:-left-12 bg-white rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-30 animate-float-slow">
                 <p className="text-[12px] font-black text-[#0A2540] tracking-tighter">
                   <span className="text-green-600">+$2,400 USD</span>
                   <span className="mx-2 text-gray-300">→</span>
                   <span className="text-indigo-600">₱134,000 PHP</span>
                 </p>
              </div>

              {/* Smart Card 3: Bottom Left - Savings Goal */}
              <div className="absolute bottom-[10%] -left-2 lg:-left-8 bg-white rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-30 transition-transform duration-300 hover:scale-105">
                 <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-1">Emergency Fund</p>
                 <div className="flex items-baseline gap-1.5">
                    <p className="text-sm font-black text-[#0A2540]">$12,000</p>
                    <p className="text-[10px] text-gray-400">/ $50,000</p>
                 </div>
                 <div className="mt-2 h-1.5 w-32 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '24%' }} />
                 </div>
              </div>

              {/* Smart Card 4: Bottom Right - Debt Health */}
              <div className="absolute bottom-[15%] right-0 lg:-right-4 bg-white rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-30 transition-transform duration-300 hover:scale-105">
                 <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-black text-[#0A2540]">DTI: 28%</p>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md font-bold text-center">✅</span>
                 </div>
                 <p className="text-[10px] font-medium text-[#6B7280]">Within US safe range</p>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Feature Grid: Staggered Layout */}
      <section className="relative z-10 pt-20 pb-32 md:pt-32 md:pb-48 bg-white/40 backdrop-blur-sm">
        <div className="max-w-[1200px] mx-auto px-6">
          
          {/* Header */}
          <div className="max-w-[600px] mb-20 md:mb-32 reveal">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-indigo-600 mb-4">Built for your global life</p>
            <h2 className="text-4xl md:text-5xl font-bold text-[#0A2540] leading-tight tracking-tight">
              Manage money across borders—without the chaos
            </h2>
            <p className="mt-6 text-lg text-[#6B7280] font-medium">
              Whether you're earning, sending, or investing, StashFlow keeps everything in sync.
            </p>
          </div>

          {/* Staggered Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            
            {/* Column 1 */}
            <div className="space-y-8 md:space-y-12 reveal" style={{ transitionDelay: '0.1s' }}>
              <FeatureCard
                title="Earn in USD. See your real balance instantly."
                description="Your income is automatically reflected across currencies so you always know your true financial position."
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-2">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-lg">🇺🇸</div>
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-lg">🇵🇭</div>
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-lg">🇸🇬</div>
                  </div>
                  <p className="text-sm font-black text-green-600">+$2,400.00</p>
                </div>
              </FeatureCard>

              <FeatureCard
                title="Understand your debt—wherever it lives"
                description="Loans from different countries are analyzed using the correct financial rules, so you know what’s healthy and what’s not."
              >
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

              <FeatureCard
                title="Upload documents. Get instant insights."
                description="Just upload your loan or statement and StashFlow builds your repayment plan automatically."
              >
                <div className="flex items-center gap-4">
                   <div className="w-16 h-20 bg-white border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-300">
                     📄
                   </div>
                   <div className="w-4 h-4 text-gray-300">→</div>
                   <div className="space-y-2">
                      <div className="h-2 w-24 bg-indigo-100 rounded" />
                      <div className="h-2 w-16 bg-gray-100 rounded" />
                      <div className="h-2 w-20 bg-gray-100 rounded" />
                   </div>
                </div>
              </FeatureCard>
            </div>

            {/* Column 2 (Staggered with mt-12 on MD+) */}
            <div className="space-y-8 md:space-y-12 md:mt-24 reveal" style={{ transitionDelay: '0.3s' }}>
              <FeatureCard
                title="Send money across countries—with full visibility"
                description="Track transfers and see how they impact your savings, expenses, and net worth in real time."
              >
                <div className="relative h-20 w-48 flex items-center justify-between">
                   <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100 shadow-sm">🏦</div>
                   <div className="flex-1 border-t-2 border-dashed border-indigo-200 relative mx-2">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-0.5 rounded-full border border-indigo-100 text-[10px] font-bold text-indigo-600 shadow-sm">
                        $500.00
                      </div>
                   </div>
                   <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 shadow-sm">🏠</div>
                </div>
              </FeatureCard>

              <FeatureCard
                title="All your finances in one timeline"
                description="Income, expenses, transfers, and loan payments—combined into a single, easy-to-follow view."
              >
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

              <FeatureCard
                title="Set goals across currencies"
                description="Save and plan with full awareness of how currency differences affect your progress."
              >
                <div className="w-full px-12">
                   <div className="relative w-20 h-20 mx-auto">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                        <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="226" strokeDashoffset="226 - (226 * 0.75)" className="text-indigo-500" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[#0A2540]">75%</div>
                   </div>
                   <p className="mt-2 text-center text-[10px] font-bold text-gray-400">Dream Home (PH)</p>
                </div>
              </FeatureCard>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-32 md:py-48 bg-gray-50/50 backdrop-blur-sm reveal">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20 md:mb-32">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-indigo-600 mb-4">Pricing</p>
            <h2 className="text-4xl md:text-5xl font-bold text-[#0A2540] leading-tight tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-6 text-lg text-[#6B7280] font-medium leading-relaxed">
              Start for free and upgrade as your global life grows. No hidden fees, no complexity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
            <PricingCard 
              tier="Free Tier"
              price="Free"
              description="Perfect for individuals just starting their global financial journey."
              features={[
                "Basic transaction tracking",
                "Unlimited income/expenses",
                "Regional DTI health checks",
                "Community support"
              ]}
              buttonText="Get started for free"
            />
            <PricingCard 
              tier="StashFlow Pro"
              highlighted
              price="$9.99"
              description="Unlock the full power of AI and regional strategy for total financial awareness."
              features={[
                "Unlimited AI Document Parsing",
                "Advanced DTI Simulators",
                "Automated Budget Rollovers",
                "Priority Support",
                "Multi-device Sync"
              ]}
              buttonText="Start free trial"
            />
          </div>

          <div className="mt-20 text-center">
            <p className="text-sm text-gray-400 font-medium">
              Trusted by 5,000+ expats and global professionals worldwide.
            </p>
          </div>
        </div>
      </section>

      {/* Footer / Final CTA */}
      <footer className="relative z-10 py-24 bg-white reveal">
         <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="text-center md:text-left">
               <h3 className="text-2xl font-bold text-[#0A2540] mb-2">Ready to sync your global life?</h3>
               <p className="text-gray-500 font-medium">Join thousands of others managing money across borders.</p>
            </div>
            <div className="flex gap-4">
               <Link 
                 href="/signup" 
                 className="h-12 px-8 bg-[#0A2540] text-white rounded-full flex items-center justify-center font-bold shadow-lg shadow-[#0A2540]/10 hover:-translate-y-0.5 transition-all"
               >
                 Start tracking now
               </Link>
            </div>
         </div>
         <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 flex justify-between items-center">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">© 2026 StashFlow Inc.</p>
            <div className="flex gap-8 text-xs text-gray-400 font-bold uppercase tracking-widest">
               <span className="hover:text-gray-900 cursor-pointer transition-colors">Privacy</span>
               <span className="hover:text-gray-900 cursor-pointer transition-colors">Terms</span>
            </div>
         </div>
      </footer>
    </main>
  );
}
