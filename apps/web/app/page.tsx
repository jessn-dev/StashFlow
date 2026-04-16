'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Chart from 'chart.js/auto'
import { YStack, XStack, Text, Heading, Button, Circle, View } from 'tamagui'

export default function LandingPage() {
  const chartRef = useRef<HTMLCanvasElement>(null)

  // Scroll Reveal Logic
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('reveal-visible')
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
            borderColor: '#1A7A7A',
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
            borderColor: '#444444',
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
              callback: (v) => `$${(Number(v) / 1000).toFixed(0)}k`,
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
    <YStack minHeight="100vh" backgroundColor="$brandBg" position="relative" overflowX="hidden">

      <style dangerouslySetInnerHTML={{__html: `
        .bg-grid {
          background-image: linear-gradient(rgba(13,61,61,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(13,61,61,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        .reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .hero-label { animation: fadeUp 0.7s ease forwards; }
        .hero-h1 { animation: fadeUp 0.7s ease 0.1s both; }
        .hero-p { animation: fadeUp 0.7s ease 0.2s both; }
        .hero-cta { animation: fadeUp 0.7s ease 0.3s both; }
      `}} />

      {/* Grid Background */}
      <YStack position="fixed" top={0} left={0} right={0} bottom={0} className="bg-grid" pointerEvents="none" zIndex={0} />

      {/* Navigation */}
      <XStack
        tag="nav"
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={50}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={32}
        paddingVertical={20}
        backgroundColor="rgba(255,255,255,0.8)"
        {...({ style: { backdropFilter: 'blur(10px)' } } as any)}
        borderBottomWidth={1}
        borderColor="rgba(13,61,61,0.1)"
      >
        <XStack alignItems="center" gap={8}>
          <Circle size={8} backgroundColor="$brandAccent" />
          <Heading size="$lg" color="$brandPrimary" fontWeight="700" fontFamily="$heading">StashFlow</Heading>
        </XStack>

        <Link href="/login" style={{ textDecoration: 'none' }}>
          <Button
            size="$3"
            borderRadius={0}
            borderWidth={1}
            borderColor="$brandPrimary"
            backgroundColor="transparent"
            color="$brandPrimary"
            fontWeight="700"
            style={{ textTransform: 'uppercase' }}
            letterSpacing={1}
            hoverStyle={{ backgroundColor: '$brandPrimary', color: 'white' }}
          >
            Sign In
          </Button>
        </Link>
      </XStack>

      {/* Hero Section — explicit CSS flex to guarantee centering on web */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 'clamp(32px, 6vw, 96px)', paddingRight: 'clamp(32px, 6vw, 96px)', paddingTop: '128px', paddingBottom: '80px', zIndex: 10 }}>
        {/* Background Decorative Text */}
        <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', fontSize: '30vw', fontWeight: 900, color: '#0D3D3D', opacity: 0.03, pointerEvents: 'none', userSelect: 'none', lineHeight: 1, fontFamily: 'Georgia, serif', overflow: 'hidden' }}>
          $
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }} className="hero-label">
          <div style={{ width: '40px', height: '1px', backgroundColor: '#1A7A7A' }} />
          <span style={{ fontSize: '12px', color: '#1A7A7A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '4px', fontFamily: 'monospace' }}>
            Personal Finance, Simplified
          </span>
        </div>

        {/* Heading — native h1 with block spans so lines never collapse */}
        <h1 className="hero-h1" style={{ margin: 0, marginBottom: '24px', padding: 0, fontFamily: 'Georgia, serif', fontSize: 'clamp(48px, 8vw, 96px)', lineHeight: 0.95, fontWeight: 900, color: '#0D3D3D' }}>
          <span style={{ display: 'block' }}>Smarter</span>
          <em style={{ display: 'block', fontStyle: 'italic', fontWeight: 300, color: '#1A7A7A' }}>Tracking.</em>
          <span style={{ display: 'block' }}>Total</span>
          <span style={{ display: 'block' }}>Clarity.</span>
        </h1>

        <p className="hero-p" style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: '#444444', opacity: 0.8, maxWidth: '42ch', lineHeight: 1.7, margin: 0, marginBottom: '48px' }}>
          See every account, every expense, and every goal in one place. StashFlow makes it easy to understand your money and actually do something about it.
        </p>

        <div className="hero-cta" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <Button
              size="$5"
              borderRadius={0}
              backgroundColor="$brandPrimary"
              color="$brandWhite"
              fontWeight="700"
              style={{ textTransform: 'uppercase' }}
              letterSpacing={1.5}
              paddingHorizontal={40}
              hoverStyle={{ backgroundColor: '$brandAccent' }}
              pressStyle={{ scale: 0.98 }}
            >
              Start Tracking
            </Button>
          </Link>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#0D3D3D', textTransform: 'uppercase', letterSpacing: '1px', padding: 0 }}>
            See the Demo →
          </button>
        </div>
      </section>

      {/* Stats Band */}
      <XStack
        flexWrap="wrap"
        backgroundColor="$brandWhite"
        borderTopWidth={1}
        borderBottomWidth={1}
        borderColor="rgba(13,61,61,0.1)"
        zIndex={10}
        position="relative"
      >
        {[
          { num: 'Free',  label: 'To Get Started',      sub: 'No credit card required' },
          { num: '🔒',    label: 'Bank-Level Security',  sub: 'Encrypted & never sold' },
          { num: '4.8k',  label: 'People Signed Up',     sub: '↑ 340 new this month' },
          { num: 'Any',   label: 'Device, Anytime',      sub: 'Web · iOS · Android soon' },
        ].map((stat, i) => (
          <YStack
            key={i}
            flex={1}
            minWidth={200}
            padding={48}
            borderRightWidth={i === 3 ? 0 : 1}
            borderColor="rgba(13,61,61,0.1)"
            className="reveal"
          >
            <Text fontSize={48} fontWeight="900" color="$brandPrimary" fontFamily="$serif">{stat.num}</Text>
            <Text fontSize={11} fontWeight="700" color="$brandText" opacity={0.6} style={{ textTransform: 'uppercase' }} letterSpacing={1.5} marginTop={12}>{stat.label}</Text>
            <Text fontSize={11} color="$brandAccent" marginTop={8} fontFamily="$mono">{stat.sub}</Text>
          </YStack>
        ))}
      </XStack>

      {/* Core Capabilities */}
      <YStack tag="section" backgroundColor="$brandBg" zIndex={10}>
        {/* Section Header */}
        <XStack
          backgroundColor="$brandWhite"
          borderTopWidth={1}
          borderBottomWidth={1}
          borderColor="rgba(13,61,61,0.1)"
          paddingHorizontal={64}
          paddingVertical={80}
          gap={32}
          flexDirection="column"
          $gtMd={{ flexDirection: 'row', alignItems: 'flex-end' }}
          className="reveal"
        >
          <YStack flex={1}>
            <Text fontSize={12} color="$brandAccent" fontWeight="700" style={{ textTransform: 'uppercase' }} letterSpacing={4} marginBottom={24}>
              What You Can Do
            </Text>
            <Heading
              style={{ fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 1.1 }}
              fontWeight="700"
              color="$brandPrimary"
              fontFamily="$heading"
            >
              Everything you need{'\n'}to own your money.
            </Heading>
          </YStack>
          <Text fontSize={16} color="$brandText" opacity={0.7} lineHeight={26} flex={1} $gtMd={{ textAlign: 'right', marginLeft: 'auto' as any }} maxWidth={420}>
            Six features designed around how real people actually manage money — from the first paycheck to the last debt payment.
          </Text>
        </XStack>

        {/* Feature Cards */}
        <View
          display="grid"
          gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))"
          backgroundColor="$brandWhite"
          borderBottomWidth={1}
          borderColor="rgba(13,61,61,0.1)"
        >
          {[
            { id: '01', title: 'Expense Tracking',   desc: 'Every purchase, subscription, and bill — automatically categorized so you always know where your money went.' },
            { id: '02', title: 'Budget Planning',    desc: 'Build a monthly budget that actually works. Set limits by category and get a nudge before you overspend.' },
            { id: '03', title: 'Net Worth Tracking', desc: 'Watch your assets grow and your debt shrink on one simple chart. Your financial health, at a glance.' },
            { id: '04', title: 'Debt Payoff',        desc: 'See all your loans and credit cards in one place. Pick a payoff strategy and track your progress month by month.' },
            { id: '05', title: 'Income Tracking',    desc: 'Log paychecks, freelance income, and side projects. Understand your full picture, not just what you spend.' },
            { id: '06', title: 'Secure & Private',   desc: 'Bank-level encryption, read-only account access, and zero data selling. Your finances stay yours.' },
          ].map((feat, i) => (
            <YStack
              key={i}
              padding={40}
              borderRightWidth={1}
              borderBottomWidth={1}
              borderColor="rgba(13,61,61,0.1)"
              hoverStyle={{ backgroundColor: 'rgba(13,61,61,0.02)' }}
              className="reveal"
            >
              <Text fontSize={12} color="$brandAccent" opacity={0.7} fontFamily="$mono" letterSpacing={2} marginBottom={24}>{feat.id}</Text>
              <Heading size="$md" color="$brandPrimary" fontWeight="700" marginBottom={12} fontFamily="$heading">{feat.title}</Heading>
              <Text fontSize={14} color="$brandText" opacity={0.8} lineHeight={22}>{feat.desc}</Text>
            </YStack>
          ))}
        </View>
      </YStack>

      {/* Chart Section */}
      <XStack
        tag="section"
        backgroundColor="$brandWhite"
        borderTopWidth={1}
        borderBottomWidth={1}
        borderColor="rgba(13,61,61,0.1)"
        zIndex={10}
        flexDirection="column"
        $gtMd={{ flexDirection: 'row' }}
      >
        <YStack
          flex={1}
          padding={48}
          $gtLg={{ padding: 96 }}
          borderRightWidth={0}
          $gtMd={{ borderRightWidth: 1 }}
          borderColor="rgba(13,61,61,0.1)"
          justifyContent="center"
          gap={32}
          className="reveal"
        >
          <XStack alignItems="center" gap={8}>
            <Circle size={6} backgroundColor="$brandAccent" />
            <Text fontSize={12} color="$brandAccent" fontWeight="700" style={{ textTransform: 'uppercase' }} letterSpacing={2}>
              Your Progress Over Time
            </Text>
          </XStack>
          <YStack>
            <Heading size="$2xl" color="$brandPrimary" fontWeight="700" marginBottom={16} fontFamily="$heading">
              Watch your net worth grow, month by month.
            </Heading>
            <Text fontSize={16} color="$brandText" opacity={0.8} lineHeight={26}>
              StashFlow shows you the full picture — what you own, what you owe, and how far you&apos;ve come. No spreadsheets required.
            </Text>
          </YStack>
          <XStack alignItems="baseline" gap={12}>
            <Text fontSize={64} fontWeight="900" color="$brandPrimary" fontFamily="$serif">+$37.4k</Text>
            <Text fontSize={13} color="$brandAccent" fontFamily="$mono">↑ net worth growth this year</Text>
          </XStack>
        </YStack>

        <YStack
          flex={1}
          padding={32}
          $gtLg={{ padding: 64 }}
          backgroundColor="rgba(13,61,61,0.02)"
          justifyContent="center"
          className="reveal"
        >
          <View width="100%" height={300} position="relative">
            <canvas ref={chartRef}></canvas>
          </View>
          <XStack justifyContent="center" gap={24} marginTop={24}>
            <XStack alignItems="center" gap={8}>
              <Circle size={10} backgroundColor="$brandAccent" />
              <Text fontSize={11} color="$brandText" opacity={0.7} style={{ textTransform: 'uppercase' }} letterSpacing={1}>Net Worth</Text>
            </XStack>
            <XStack alignItems="center" gap={8}>
              <View width={10} height={10} borderRadius={999} borderWidth={1} borderColor="$brandText" borderStyle="dashed" />
              <Text fontSize={11} color="$brandText" opacity={0.7} style={{ textTransform: 'uppercase' }} letterSpacing={1}>Liabilities</Text>
            </XStack>
          </XStack>
        </YStack>
      </XStack>

      {/* CTA Section */}
      <YStack
        tag="section"
        paddingVertical={128}
        paddingHorizontal={32}
        alignItems="center"
        backgroundColor="$brandBg"
        position="relative"
        zIndex={10}
        className="reveal"
      >
        <View
          position="absolute"
          width={600}
          height={300}
          backgroundColor="$brandAccent"
          opacity={0.05}
          borderRadius={999}
          style={{ filter: 'blur(80px)' }}
          pointerEvents="none"
        />
        <Text fontSize={12} fontWeight="700" color="$brandAccent" style={{ textTransform: 'uppercase' }} letterSpacing={3} marginBottom={24}>Get Started Today</Text>
        <h2 style={{ margin: 0, marginBottom: '24px', padding: 0, fontFamily: 'Georgia, serif', fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 900, color: '#0D3D3D', textAlign: 'center', maxWidth: '800px', lineHeight: 1.1 }}>
          Your path to{' '}
          <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#1A7A7A' }}>financial freedom</em>
          {' '}starts here.
        </h2>
        <Text fontSize={16} color="$brandText" opacity={0.8} textAlign="center" maxWidth={600} marginBottom={48}>
          Stop wondering where your money goes. Join StashFlow to securely manage your spending, crush your debt, and build your wealth.
        </Text>
        <Link href="/login" style={{ textDecoration: 'none' }}>
          <Button
            size="$5"
            borderRadius={0}
            backgroundColor="$brandPrimary"
            color="$brandWhite"
            fontWeight="700"
            style={{ textTransform: 'uppercase' }}
            letterSpacing={1.5}
            paddingHorizontal={48}
            hoverStyle={{ backgroundColor: '$brandAccent' }}
            shadowColor="black"
            shadowOpacity={0.1}
            shadowRadius={20}
          >
            Create Your Free Account
          </Button>
        </Link>
      </YStack>

      {/* Footer */}
      <XStack
        tag="footer"
        padding={48}
        backgroundColor="$brandWhite"
        borderTopWidth={1}
        borderColor="rgba(13,61,61,0.1)"
        justifyContent="space-between"
        alignItems="center"
        zIndex={10}
        flexDirection="column"
        $gtMd={{ flexDirection: 'row' }}
        gap={24}
      >
        <Text fontSize={11} color="$brandText" opacity={0.5} fontFamily="$mono">© 2026 StashFlow Inc. All rights reserved.</Text>
        <XStack gap={32}>
          <Link href="#" style={{ textDecoration: 'none' }}><Text fontSize={11} fontWeight="700" color="$brandText" opacity={0.6} style={{ textTransform: 'uppercase' }} letterSpacing={1}>Privacy</Text></Link>
          <Link href="#" style={{ textDecoration: 'none' }}><Text fontSize={11} fontWeight="700" color="$brandText" opacity={0.6} style={{ textTransform: 'uppercase' }} letterSpacing={1}>Terms</Text></Link>
          <Link href="#" style={{ textDecoration: 'none' }}><Text fontSize={11} fontWeight="700" color="$brandText" opacity={0.6} style={{ textTransform: 'uppercase' }} letterSpacing={1}>Security</Text></Link>
        </XStack>
      </XStack>

    </YStack>
  )
}
