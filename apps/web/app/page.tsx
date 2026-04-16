'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Chart from 'chart.js/auto'

export default function LandingPage() {
  const chartRef = useRef<HTMLCanvasElement>(null)

  // Intersection Observer for Scroll Reveals
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('opacity-100', 'translate-y-0')
            e.target.classList.remove('opacity-0', 'translate-y-6')
          }
        })
      },
      { threshold: 0.12 }
    )

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Chart.js Initialization
  useEffect(() => {
    if (!chartRef.current) return

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    // Realistic personal finance data: Net worth going up, Debt going down
    const netWorthData = [45000, 48500, 51000, 50500, 54000, 58000, 62000, 61500, 66000, 71000, 75500, 82400]
    const debtData = [28000, 27200, 26400, 25600, 24800, 23000, 22200, 21400, 20600, 18000, 17200, 15400]

    const chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Net Worth',
            data: netWorthData,
            borderColor: '#1A7A7A', // brand-accent
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.4,
            fill: true,
            backgroundColor: (context) => {
              const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 260)
              gradient.addColorStop(0, 'rgba(26, 122, 122, 0.15)')
              gradient.addColorStop(1, 'rgba(26, 122, 122, 0)')
              return gradient
            },
          },
          {
            label: 'Total Liabilities',
            data: debtData,
            borderColor: '#444444', // brand-text for contrast
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
            tension: 0.4,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0D3D3D',
            titleColor: '#FFFFFF',
            bodyColor: '#EFEFEF',
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: $${(ctx.parsed.y ?? 0).toLocaleString()}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(13, 61, 61, 0.05)', drawTicks: false },
            ticks: { color: '#444444' },
          },
          y: {
            grid: { color: 'rgba(13, 61, 61, 0.05)', drawTicks: false },
            ticks: {
              color: '#444444',
              callback: (v) => `$${(Number(v) / 1000).toFixed(0)}k`, // Formats as $50k, $80k
            },
            min: 0,
            max: 100000,
          },
        },
      },
    })

    return () => chartInstance.destroy()
  }, [])

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans selection:bg-brand-accent selection:text-white relative overflow-x-hidden">
      
      {/* Inline styles for specific animations that are tedious to put in tailwind config */}
      <style dangerouslySetInnerHTML={{__html: `
        .bg-grid {
          background-image: linear-gradient(rgba(13,61,61,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(13,61,61,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .animate-ticker { animation: ticker 30s linear infinite; }
        .reveal { transition: opacity 0.7s ease, transform 0.7s ease; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .hero-label { animation: fadeUp 0.7s ease forwards; }
        .hero-h1 { animation: fadeUp 0.7s ease 0.1s both; }
        .hero-p { animation: fadeUp 0.7s ease 0.2s both; }
        .hero-cta { animation: fadeUp 0.7s ease 0.3s both; }
        .ticker-band { animation: fadeUp 1s ease 0.5s both; }
      `}} />

      {/* Grid Background */}
      <div className="fixed inset-0 bg-grid pointer-events-none z-0"></div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 bg-white/80 backdrop-blur-md border-b border-brand-primary/10">
        <div className="flex items-center gap-2 font-serif text-2xl font-bold text-brand-primary">
          <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></span>{' '}
          FinTrack
        </div>
        <ul className="hidden md:flex gap-10 text-sm font-medium tracking-widest uppercase text-brand-text/70">
          {/*<li><a href="#" className="hover:text-brand-accent transition-colors">Platform</a></li>*/}
          {/*<li><a href="#" className="hover:text-brand-accent transition-colors">Analytics</a></li>*/}
          {/*<li><a href="#" className="hover:text-brand-accent transition-colors">Pricing</a></li>*/}
        </ul>
        <Link href="/login" className="text-sm font-bold tracking-widest uppercase px-6 py-2 border border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white transition-colors">
          Sign In
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-center px-8 pt-32 pb-28 z-10 lg:px-24">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 font-serif text-[30vw] font-black text-brand-primary/[0.03] pointer-events-none select-none leading-none">
          $
        </div>

        <div className="hero-label text-sm font-mono tracking-[0.3em] uppercase text-brand-accent mb-8 flex items-center gap-4">
          <div className="w-10 h-[1px] bg-brand-accent"></div>
          Revolutionize Finance
        </div>

        <h1 className="hero-h1 font-serif text-6xl md:text-[7rem] font-black leading-[0.95] text-brand-primary max-w-[14ch]">
          <span className="block">Smarter</span>
          <em className="block italic text-brand-accent font-light">Tracking.</em>
          <span className="block">Total</span>
          <span className="block">Clarity.</span>
        </h1>

        <p className="hero-p text-lg md:text-xl text-brand-text/80 max-w-[42ch] leading-relaxed mt-8">
          The financial intelligence layer that transforms raw data into decisive insight. Built for individuals who can&apos;t afford ambiguity.
        </p>

        <div className="hero-cta flex items-center gap-8 mt-12">
          <Link href="/login" className="bg-brand-primary text-white text-sm font-bold tracking-widest uppercase px-10 py-4 hover:bg-brand-primary/90 transition-all hover:-translate-y-0.5">
            Start Tracking
          </Link>
          <button className="text-sm font-bold tracking-widest uppercase text-brand-text hover:text-brand-accent transition-colors flex items-center gap-2 group">
            See the Demo <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
          </button>
        </div>
      </section>

      {/* Ticker — full-width band outside hero */}
      <div className="ticker-band relative z-10 w-full overflow-hidden border-y border-brand-primary/10 py-3 bg-white/50 backdrop-blur-sm">
        <div className="flex gap-12 w-max animate-ticker text-xs font-mono tracking-wider text-brand-text/70">
          {(['ticker-1', 'ticker-2'] as const).map((key) => (
            <div key={key} className="flex gap-12">
              <span className="flex gap-2 items-center"><span className="text-brand-primary font-bold">AAPL</span> $187.42 <span className="text-green-600">▲ 1.23%</span></span>
              <span className="flex gap-2 items-center"><span className="text-brand-primary font-bold">MSFT</span> $412.85 <span className="text-green-600">▲ 0.87%</span></span>
              <span className="flex gap-2 items-center"><span className="text-brand-primary font-bold">NVDA</span> $891.20 <span className="text-green-600">▲ 3.14%</span></span>
              <span className="flex gap-2 items-center"><span className="text-brand-primary font-bold">TSLA</span> $178.60 <span className="text-red-500">▼ 0.55%</span></span>
              <span className="flex gap-2 items-center"><span className="text-brand-primary font-bold">AMZN</span> $192.30 <span className="text-green-600">▲ 1.77%</span></span>
              <span className="flex gap-2 items-center"><span className="text-brand-primary font-bold">GOOGL</span> $171.95 <span className="text-green-600">▲ 0.43%</span></span>
              <span className="flex gap-2 items-center"><span className="text-brand-primary font-bold">BTC</span> $67,442 <span className="text-green-600">▲ 2.91%</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Band */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 border-y border-brand-primary/10 bg-white">
        {[
          { num: '$2.4T', label: 'Assets Tracked', sub: '↑ 18.3% this quarter' },
          { num: '99.9%', label: 'Uptime SLA', sub: '↑ 6 nines target' },
          { num: '8ms', label: 'Avg. Latency', sub: '↓ 41% vs. last year' },
          { num: '4.8k', label: 'Global Clients', sub: '↑ 340 new this month' },
        ].map((stat) => (
          <div key={stat.label} className="p-8 md:p-12 border-b md:border-b-0 md:border-r border-brand-primary/10 last:border-0 reveal opacity-0 translate-y-6">
            <div className="font-serif text-4xl md:text-5xl font-bold text-brand-primary">{stat.num}</div>
            <div className="text-xs font-bold tracking-widest uppercase text-brand-text/60 mt-3">{stat.label}</div>
            <div className="text-xs font-mono text-brand-accent mt-2">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Core Capabilities */}
      <section className="relative z-10 bg-brand-bg">
        {/* Section Header */}
        <div className="bg-white border-y border-brand-primary/10 px-10 py-16 md:px-16 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-8 items-end reveal opacity-0 translate-y-6">
          <div>
            <div className="text-xs font-mono tracking-[0.3em] uppercase text-brand-accent mb-6">Core Capabilities</div>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-brand-primary leading-tight">
              Every edge.<br />Every signal.
            </h2>
          </div>
          <p className="text-brand-text/70 leading-relaxed md:text-right md:max-w-[40ch] md:ml-auto">
            Six pillars built for teams demanding precision where it counts most. No noise. No lag. No compromise.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 border-t border-brand-primary/10 bg-white">
          {[
            {
              id: '01',
              title: 'Real-Time Pulse',
              desc: 'Sub-10ms market data ingestion across 180+ exchanges. Every tick captured and indexed.'
            },
            {
              id: '02',
              title: 'Predictive Forecast',
              desc: 'Proprietary models trained on market cycles. Probability-weighted scenarios, not gut feel.'
            },
            {
              id: '03',
              title: 'Portfolio Command',
              desc: 'Consolidated view across equities, crypto, and alternatives. One dashboard, every exposure.'
            },
            {
              id: '04',
              title: 'Risk Architecture',
              desc: 'Dynamic VaR, stress testing, and tail-risk modeling with regulatory-grade reporting baked in.'
            },
            {
              id: '05',
              title: 'Alpha Intelligence',
              desc: 'Sentiment analysis and alternative data signals surfaced automatically before consensus.'
            },
            {
              id: '06',
              title: 'Automation Engine',
              desc: 'Rules-based workflows, smart alerts, and API-first architecture that fits into any stack.'
            },
          ].map((feat) => (
            <div key={feat.id} className="p-10 border-r border-b border-brand-primary/10 hover:bg-brand-bg transition-colors reveal opacity-0 translate-y-6">
              <div className="text-xs font-mono tracking-[0.2em] text-brand-accent/70 mb-6">{feat.id}</div>
              <h3 className="font-serif text-2xl font-bold text-brand-primary mb-3">{feat.title}</h3>
              <p className="text-sm text-brand-text/80 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Chart Section */}
      <section className="relative z-10 grid grid-cols-1 md:grid-cols-2 min-h-[500px] border-y border-brand-primary/10 bg-white">
        <div className="p-12 lg:p-24 border-b md:border-b-0 md:border-r border-brand-primary/10 flex flex-col justify-center gap-8 reveal opacity-0 translate-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-mono tracking-[0.2em] text-brand-accent uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse"></span> Live Performance
          </div>
          <div>
            <h2 className="font-serif text-4xl font-bold text-brand-primary mb-4">Returns that speak for themselves</h2>
            <p className="text-brand-text/80 leading-relaxed">Portfolios using FinTrack consistently outperform benchmark indices through disciplined, data-led rebalancing.</p>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-6xl font-bold text-brand-primary">+34.2%</span>
            <span className="font-mono text-brand-accent text-sm">↑ vs. 18.7% SPX</span>
          </div>
        </div>
        <div className="p-8 lg:p-16 flex flex-col justify-center reveal opacity-0 translate-y-6 bg-brand-bg/30">
          <div className="w-full h-[260px] relative">
            <canvas id="mainChart" ref={chartRef}></canvas>
          </div>
          {/* Mini Legend */}
          <div className="flex gap-6 mt-6 justify-center">
            <div className="flex items-center gap-2 text-xs font-mono text-brand-text/70 uppercase tracking-wider">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-accent"></div> Net Worth
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-brand-text/70 uppercase tracking-wider">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-text border border-brand-text border-dashed"></div> Liabilities
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32 px-8 text-center bg-brand-bg overflow-hidden reveal opacity-0 translate-y-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand-accent/5 rounded-[100%] blur-3xl pointer-events-none"></div>
        <div className="text-xs font-bold tracking-widest uppercase text-brand-accent mb-6">Get Started Today</div>
        <h2 className="font-serif text-5xl md:text-6xl font-black text-brand-primary mb-6">
          Your path to <em className="italic text-brand-accent font-light">financial freedom</em> starts here.
        </h2>
        <p className="max-w-2xl mx-auto text-brand-text/80 mb-12">
          Stop wondering where your money goes. Join FinTrack to securely manage your spending, crush your debt, and build your wealth.
        </p>
        <Link href="/login" className="inline-block bg-brand-primary text-white text-sm font-bold tracking-widest uppercase px-10 py-4 hover:bg-brand-primary/90 transition-all hover:-translate-y-0.5 shadow-lg shadow-brand-primary/20">
          Create Your Free Account
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-white border-t border-brand-primary/10 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-xs font-mono text-brand-text/50">© 2026 FinTrack Inc. All rights reserved.</div>
        <ul className="flex gap-8 text-xs font-bold tracking-widest uppercase text-brand-text/60">
          <li><button type="button" className="hover:text-brand-accent transition-colors">Privacy</button></li>
          <li><button type="button" className="hover:text-brand-accent transition-colors">Terms</button></li>
          <li><button type="button" className="hover:text-brand-accent transition-colors">Security</button></li>
        </ul>
      </footer>
    </div>
  )
}