'use client'

import React, { useState, useRef } from 'react'
import { YStack, XStack, Text } from 'tamagui'
import { CashFlowPayload, CashFlowProjection } from '@stashflow/api'
import { formatCurrency } from '@stashflow/core'
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight } from 'lucide-react-native'

const CATEGORY_ORDER = ['housing', 'food', 'transport', 'utilities', 'healthcare', 'entertainment', 'education', 'personal', 'other']

const CATEGORY_LABELS: Record<string, string> = {
  housing: 'Housing', food: 'Food', transport: 'Transport', utilities: 'Utilities',
  healthcare: 'Healthcare', entertainment: 'Entertainment', education: 'Education',
  personal: 'Personal', other: 'Other',
}

// ─── Chart ───────────────────────────────────────────────────────────────────

const W = 760, H = 240
const PAD = { top: 20, right: 24, bottom: 36, left: 72 }
const CW = W - PAD.left - PAD.right
const CH = H - PAD.top - PAD.bottom
const BASELINE = H - PAD.bottom

function xAt(i: number, n: number) { return PAD.left + (i / (n - 1)) * CW }
function yAt(v: number, max: number) { return PAD.top + CH - (v / max) * CH }

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const cp = (pts[i - 1].x + pts[i].x) / 2
    d += ` C ${cp.toFixed(1)} ${pts[i - 1].y.toFixed(1)} ${cp.toFixed(1)} ${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`
  }
  return d
}

function mkArea(pts: { x: number; y: number }[], path: string): string {
  if (pts.length < 2) return ''
  return [path, `L ${pts.at(-1)!.x.toFixed(1)} ${BASELINE}`, `L ${pts[0].x.toFixed(1)} ${BASELINE}`, 'Z'].join(' ')
}

function compactCurrency(v: number, currency: string): string {
  const sym = currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${sym}${Math.round(v / 1_000)}K`
  return `${sym}${v}`
}

// ─── Chart component ──────────────────────────────────────────────────────────

interface CashFlowChartProps {
  projections: CashFlowProjection[]
  currency: string
  viewMode: 'projected' | 'actual'
  hoveredIdx: number | null
  onHover: (idx: number, e: React.MouseEvent) => void
  onLeave: () => void
}

function CashFlowChart({ projections, currency, viewMode, hoveredIdx, onHover, onLeave }: CashFlowChartProps) {
  const todayPeriod = new Date().toISOString().slice(0, 7)
  const n   = projections.length
  const max = Math.max(...projections.flatMap(p => [p.income, p.expenses + p.debt]), 1000) * 1.08

  const incPts = projections.map((p, i) => ({ x: xAt(i, n), y: yAt(p.income, max) }))
  const expPts = projections.map((p, i) => ({ x: xAt(i, n), y: yAt(p.expenses + p.debt, max) }))

  // splitAt = first index that is strictly future (projected)
  const splitAt = (() => {
    const idx = projections.findIndex(p => p.period > todayPeriod)
    return idx === -1 ? n : idx
  })()

  // Actual path includes one extra point past the split for a smooth bezier join
  const actIncPts = incPts.slice(0, Math.min(splitAt + 1, n))
  const actExpPts = expPts.slice(0, Math.min(splitAt + 1, n))
  // Projected path starts one point before the split for the same reason
  const projIncPts = splitAt < n ? incPts.slice(Math.max(0, splitAt - 1)) : []
  const projExpPts = splitAt < n ? expPts.slice(Math.max(0, splitAt - 1)) : []

  // Dots: no overlap, clean split
  const actDotInc  = incPts.slice(0, splitAt)
  const actDotExp  = expPts.slice(0, splitAt)
  const projDotInc = incPts.slice(splitAt)
  const projDotExp = expPts.slice(splitAt)

  const actIncPath  = smoothPath(actIncPts)
  const actExpPath  = smoothPath(actExpPts)
  const projIncPath = smoothPath(projIncPts)
  const projExpPath = smoothPath(projExpPts)

  const actIncArea  = mkArea(actIncPts,  actIncPath)
  const actExpArea  = mkArea(actExpPts,  actExpPath)
  const projIncArea = mkArea(projIncPts, projIncPath)
  const projExpArea = mkArea(projExpPts, projExpPath)

  // Dimming: in 'projected' mode the actual section fades; in 'actual' mode projected fades
  const actOpacity  = viewMode === 'projected' ? 0.42 : 1
  const projOpacity = viewMode === 'actual'    ? 0.28 : 1

  // Dashed separator between actual and projected
  const cutoffX = splitAt > 0 && splitAt < n
    ? ((incPts[splitAt - 1].x + incPts[splitAt].x) / 2).toFixed(1)
    : null

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    let nearest = 0, minDist = Infinity
    for (let i = 0; i < n; i++) {
      const d = Math.abs(xAt(i, n) - svgX)
      if (d < minDist) { minDist = d; nearest = i }
    }
    onHover(nearest, e)
  }

  const gridLines = [0.25, 0.5, 0.75, 1]
  const yLabels   = [0, 0.25, 0.5, 0.75, 1]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
      aria-hidden="true"
      onMouseMove={handleMouseMove}
      onMouseLeave={onLeave}
    >
      <defs>
        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#22C55E" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#22C55E" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#EF4444" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#EF4444" stopOpacity="0.03" />
        </linearGradient>
      </defs>

      {/* Horizontal grid */}
      {gridLines.map(pct => (
        <line key={pct} x1={PAD.left} y1={yAt(max * pct, max).toFixed(1)} x2={W - PAD.right} y2={yAt(max * pct, max).toFixed(1)} stroke="rgba(13,61,61,0.06)" strokeWidth={1} />
      ))}

      {/* Baseline */}
      <line x1={PAD.left} y1={BASELINE} x2={W - PAD.right} y2={BASELINE} stroke="rgba(13,61,61,0.12)" strokeWidth={1} />

      {/* Y-axis labels */}
      {yLabels.map(pct => (
        <text key={pct} x={PAD.left - 10} y={(yAt(max * pct, max) + 4).toFixed(1)} textAnchor="end" fontSize={10} fill="rgba(13,61,61,0.35)" fontFamily="system-ui,sans-serif">
          {compactCurrency(Math.round(max * pct), currency)}
        </text>
      ))}

      {/* Actual section — solid lines */}
      <g opacity={actOpacity}>
        {actIncArea  && <path d={actIncArea}  fill="url(#incomeGrad)"  />}
        {actExpArea  && <path d={actExpArea}  fill="url(#expenseGrad)" />}
        {actIncPath  && <path d={actIncPath}  fill="none" stroke="#22C55E" strokeWidth={2.5} strokeLinejoin="round" />}
        {actExpPath  && <path d={actExpPath}  fill="none" stroke="#EF4444" strokeWidth={2}   strokeLinejoin="round" />}
        {actDotInc.map((pt, i) => <circle key={i} cx={pt.x.toFixed(1)} cy={pt.y.toFixed(1)} r={3}   fill="#22C55E" />)}
        {actDotExp.map((pt, i) => <circle key={i} cx={pt.x.toFixed(1)} cy={pt.y.toFixed(1)} r={2.5} fill="#EF4444" />)}
      </g>

      {/* Projected section — dashed lines */}
      <g opacity={projOpacity}>
        {projIncArea && <path d={projIncArea} fill="url(#incomeGrad)"  />}
        {projExpArea && <path d={projExpArea} fill="url(#expenseGrad)" />}
        {projIncPath && <path d={projIncPath} fill="none" stroke="#22C55E" strokeWidth={2}   strokeDasharray="5,3" strokeLinejoin="round" />}
        {projExpPath && <path d={projExpPath} fill="none" stroke="#EF4444" strokeWidth={2}   strokeDasharray="5,3" strokeLinejoin="round" />}
        {projDotInc.map((pt, i) => <circle key={i} cx={pt.x.toFixed(1)} cy={pt.y.toFixed(1)} r={2.5} fill="#22C55E" />)}
        {projDotExp.map((pt, i) => <circle key={i} cx={pt.x.toFixed(1)} cy={pt.y.toFixed(1)} r={2}   fill="#EF4444" />)}
      </g>

      {/* Separator between actual and projected */}
      {cutoffX && (
        <line x1={cutoffX} y1={PAD.top} x2={cutoffX} y2={BASELINE} stroke="rgba(13,61,61,0.2)" strokeWidth={1} strokeDasharray="3,2" />
      )}

      {/* Hover: vertical crosshair + enlarged dots */}
      {hoveredIdx !== null && (() => {
        const hx  = xAt(hoveredIdx, n).toFixed(1)
        const hiy = incPts[hoveredIdx].y.toFixed(1)
        const hey = expPts[hoveredIdx].y.toFixed(1)
        return (
          <>
            <line x1={hx} y1={PAD.top} x2={hx} y2={BASELINE} stroke="rgba(13,61,61,0.18)" strokeWidth={1} />
            <circle cx={hx} cy={hiy} r={5}   fill="#22C55E" stroke="white" strokeWidth={2} />
            <circle cx={hx} cy={hey} r={4.5} fill="#EF4444" stroke="white" strokeWidth={2} />
          </>
        )
      })()}

      {/* X-axis month labels — every other, always show last */}
      {projections.map((p, i) => {
        if (i % 2 !== 0 && i !== n - 1) return null
        return (
          <text key={i} x={xAt(i, n).toFixed(1)} y={H - 4} textAnchor="middle" fontSize={10} fill="rgba(13,61,61,0.4)" fontFamily="system-ui,sans-serif">
            {p.month.split(' ')[0]}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Hover tooltip ────────────────────────────────────────────────────────────

function TooltipRow({ label, dot, value, valueColor, indent }: {
  label: string; dot?: string; value: string; valueColor?: string; indent?: boolean
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5, paddingLeft: indent ? 13 : 0 }}>
        {dot && <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', backgroundColor: dot, flexShrink: 0 }} />}
        {label}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: valueColor ?? '#374151' }}>{value}</span>
    </div>
  )
}

interface ChartTooltipProps {
  projection: CashFlowProjection
  currency: string
  position: { x: number; y: number }
  isActual: boolean
  confidence: number
  containerWidth: number
}

function ChartTooltip({ projection: p, currency, position, isActual, confidence, containerWidth }: ChartTooltipProps) {
  const netColor  = p.net >= 0 ? '#15803D' : '#DC2626'
  const confColor = isActual ? '#15803D' : confidence >= 80 ? '#0D4F4F' : confidence >= 65 ? '#D97706' : '#DC2626'
  const flipLeft  = position.x > containerWidth * 0.58

  const topCats = Object.entries(p.expensesByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  return (
    <div style={{
      position: 'absolute',
      top: Math.max(4, position.y - 100),
      left:  flipLeft ? undefined : position.x + 16,
      right: flipLeft ? containerWidth - position.x + 16 : undefined,
      zIndex: 20,
      pointerEvents: 'none',
      background: 'white',
      border: '1px solid rgba(13,61,61,0.11)',
      borderRadius: 10,
      padding: '12px 16px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.09)',
      minWidth: 215,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{p.month}</span>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
          backgroundColor: `${confColor}18`, color: confColor, whiteSpace: 'nowrap',
        }}>
          {isActual ? 'Actual' : `${confidence}% conf.`}
        </span>
      </div>

      {/* Income / expense breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: topCats.length > 0 ? 10 : 0 }}>
        <TooltipRow label="Income"   dot="#22C55E" value={formatCurrency(p.income,   currency)} valueColor="#059669" />
        <TooltipRow label="Expenses" dot="#EF4444" value={formatCurrency(p.expenses, currency)} />
        {p.debt > 0 && <TooltipRow label="Debt" value={formatCurrency(p.debt, currency)} valueColor="#DC2626" indent />}
        <div style={{ borderTop: '1px solid rgba(13,61,61,0.06)', marginTop: 2, paddingTop: 4, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Net</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: netColor }}>{formatCurrency(p.net, currency)}</span>
        </div>
      </div>

      {/* Top categories */}
      {topCats.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(13,61,61,0.07)', paddingTop: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(13,61,61,0.35)', marginBottom: 5 }}>
            Top Categories
          </div>
          {topCats.map(([cat, amt]) => (
            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: '#6b7280' }}>{CATEGORY_LABELS[cat] ?? cat}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{formatCurrency(amt, currency)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Insight engine ───────────────────────────────────────────────────────────

type InsightType = 'warning' | 'positive' | 'info'
interface Insight { type: InsightType; emoji: string; text: string }

const INSIGHT_STYLES: Record<InsightType, { bg: string; border: string; color: string }> = {
  warning:  { bg: '#FFF7ED', border: '#FED7AA', color: '#C2410C' },
  positive: { bg: '#F0FDF4', border: '#BBF7D0', color: '#15803D' },
  info:     { bg: 'rgba(13,61,61,0.04)', border: 'rgba(13,61,61,0.12)', color: '#0D4F4F' },
}

function shortMonth(m: string) { return m.split(' ')[0] }

function generateInsights(projections: CashFlowProjection[], currency: string): Insight[] {
  if (!projections.length) return []
  const insights: Insight[] = []

  const negMonths = projections.filter(p => p.net < 0)
  if (negMonths.length === 0) {
    insights.push({ type: 'positive', emoji: '💡', text: 'Positive cash flow maintained across all 12 months' })
  } else {
    const labels = negMonths.slice(0, 2).map(p => shortMonth(p.month)).join(', ')
    const more   = negMonths.length > 2 ? ` +${negMonths.length - 2} more` : ''
    insights.push({ type: 'warning', emoji: '⚠️', text: `Negative cash flow projected in ${labels}${more}` })
  }

  const tight = projections.filter(p => p.income > 0 && p.net > 0 && p.net / p.income < 0.10)
  if (tight.length >= 2) {
    insights.push({ type: 'warning', emoji: '⚠️', text: `${shortMonth(tight[0].month)}–${shortMonth(tight[tight.length - 1].month)} margin is tight (<10% of income)` })
  } else if (tight.length === 1) {
    insights.push({ type: 'warning', emoji: '⚠️', text: `${shortMonth(tight[0].month)} margin is tight (<10% of income)` })
  }

  const avgExp  = projections.reduce((s, p) => s + p.expenses, 0) / projections.length
  const peakExp = projections.reduce((hi, p) => p.expenses > hi.expenses ? p : hi, projections[0])
  if (peakExp.expenses > avgExp * 1.15) {
    insights.push({ type: 'info', emoji: '📈', text: `Expenses peak in ${shortMonth(peakExp.month)} — plan ahead for higher spending` })
  }

  for (let i = 1; i < projections.length; i++) {
    if (projections[i].debt < projections[i - 1].debt) {
      const freed = projections[i - 1].debt - projections[i].debt
      insights.push({ type: 'positive', emoji: '🎯', text: `Loan payoff in ${shortMonth(projections[i].month)} frees ${formatCurrency(freed, currency)}/mo` })
      break
    }
  }

  const heavyDebt = projections.filter(p => p.income > 0 && p.debt / p.income > 0.40)
  if (heavyDebt.length > 0) {
    insights.push({ type: 'warning', emoji: '⚠️', text: `Debt exceeds 40% of income in ${heavyDebt.length} month${heavyDebt.length > 1 ? 's' : ''}` })
  }

  return insights
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CashFlowUIProps {
  payload: CashFlowPayload
  userEmail: string
}

export default function CashFlowUI({ payload, userEmail }: CashFlowUIProps) {
  const { projections, currency } = payload
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'projected' | 'actual'>('projected')
  const [hovered, setHovered]   = useState<{ idx: number; x: number; y: number } | null>(null)
  const chartRef                = useRef<HTMLDivElement>(null)
  const todayPeriod             = new Date().toISOString().slice(0, 7)

  function getConfidence(period: string): number {
    if (period <= todayPeriod) return 98
    const [fy, fm] = period.split('-').map(Number)
    const [ty, tm] = todayPeriod.split('-').map(Number)
    const monthsAhead = (fy - ty) * 12 + (fm - tm)
    return Math.round(Math.max(55, 92 - monthsAhead * 3.5))
  }

  function handleChartHover(idx: number, e: React.MouseEvent) {
    if (!chartRef.current) return
    const rect = chartRef.current.getBoundingClientRect()
    setHovered({ idx, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  function toggle(period: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(period) ? next.delete(period) : next.add(period)
      return next
    })
  }

  const insights = generateInsights(projections, currency)

  return (
    <YStack gap={32}>
      {/* Chart */}
      <YStack backgroundColor="$brandWhite" padding={32} borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)" gap={20}>
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={18} fontWeight="700" color="$brandPrimary">12-Month Outlook</Text>
          <XStack gap={16} alignItems="center">
            {/* Projected / Actual toggle */}
            <div style={{ display: 'flex', border: '1px solid rgba(13,61,61,0.12)', borderRadius: 8, overflow: 'hidden' }}>
              {(['projected', 'actual'] as const).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{
                  padding: '5px 14px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: 'none', outline: 'none',
                  backgroundColor: viewMode === mode ? '#0D4F4F' : 'transparent',
                  color: viewMode === mode ? 'white' : 'rgba(13,61,61,0.45)',
                  transition: 'background 0.15s, color 0.15s',
                  textTransform: 'capitalize',
                }}>
                  {mode}
                </button>
              ))}
            </div>
            {/* Legend */}
            <XStack gap={20} alignItems="center">
              <XStack gap={7} alignItems="center">
                <svg width={24} height={10} style={{ display: 'block', flexShrink: 0 }}>
                  <line x1="0" y1="5" x2="24" y2="5" stroke="#22C55E" strokeWidth="2.5" />
                  <circle cx="12" cy="5" r="3" fill="#22C55E" />
                </svg>
                <Text fontSize={12} color="$brandTextSub">Income</Text>
              </XStack>
              <XStack gap={7} alignItems="center">
                <svg width={24} height={10} style={{ display: 'block', flexShrink: 0 }}>
                  <line x1="0" y1="5" x2="24" y2="5" stroke="#EF4444" strokeWidth="2" />
                  <circle cx="12" cy="5" r="2.5" fill="#EF4444" />
                </svg>
                <Text fontSize={12} color="$brandTextSub">Expenses + Debt</Text>
              </XStack>
              <XStack gap={7} alignItems="center">
                <div style={{ width: 16, height: 10, borderRadius: 2, background: 'linear-gradient(to bottom, rgba(34,197,94,0.35) 0%, rgba(34,197,94,0.06) 100%)', border: '1px solid rgba(34,197,94,0.25)' }} />
                <Text fontSize={12} color="$brandTextSub">Net surplus</Text>
              </XStack>
            </XStack>
          </XStack>
        </XStack>

        <div
          ref={chartRef}
          style={{ position: 'relative', height: 240 }}
          onMouseLeave={() => setHovered(null)}
        >
          <CashFlowChart
            projections={projections}
            currency={currency}
            viewMode={viewMode}
            hoveredIdx={hovered?.idx ?? null}
            onHover={handleChartHover}
            onLeave={() => setHovered(null)}
          />
          {hovered !== null && (
            <ChartTooltip
              projection={projections[hovered.idx]}
              currency={currency}
              position={{ x: hovered.x, y: hovered.y }}
              isActual={projections[hovered.idx].period <= todayPeriod}
              confidence={getConfidence(projections[hovered.idx].period)}
              containerWidth={chartRef.current?.offsetWidth ?? 600}
            />
          )}
        </div>
      </YStack>

      {/* Insights */}
      {insights.length > 0 && (
        <YStack gap={12}>
          <Text fontSize={13} fontWeight="700" color="$brandPrimary" textTransform="uppercase" letterSpacing={1}>Insights</Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {insights.map((ins, i) => {
              const s = INSIGHT_STYLES[ins.type]
              return (
                <div key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', borderRadius: 8,
                  border: `1px solid ${s.border}`,
                  backgroundColor: s.bg, fontSize: 13, color: s.color,
                  fontWeight: 500, lineHeight: 1.4,
                }}>
                  <span style={{ fontSize: 14 }}>{ins.emoji}</span>
                  {ins.text}
                </div>
              )
            })}
          </div>
        </YStack>
      )}

      {/* Monthly breakdown table */}
      <YStack backgroundColor="$brandWhite" borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)" overflow="hidden">
        <XStack padding={24} backgroundColor="rgba(13,61,61,0.02)" borderBottomWidth={1} borderColor="rgba(13,61,61,0.05)" justifyContent="space-between" alignItems="center">
          <Text fontSize={16} fontWeight="700" color="$brandPrimary">Monthly Breakdown</Text>
          <Text fontSize={12} color="$brandTextSub">Click a month to expand</Text>
        </XStack>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Month', 'Est. Income', 'Recurring Exp', 'Loan Debt', 'Net Cash Flow'].map((h, i) => (
                  <th key={h} style={{
                    padding: '12px 24px', textAlign: i >= 1 ? 'right' : 'left',
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.07em', color: 'rgba(13,61,61,0.4)',
                    borderBottom: '1px solid rgba(13,61,61,0.06)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projections.map((p, idx) => {
                const isOpen = expanded.has(p.period)
                const hasCategories = Object.keys(p.expensesByCategory).length > 0
                const sortedCategories = CATEGORY_ORDER
                  .filter(c => p.expensesByCategory[c] != null)
                  .concat(Object.keys(p.expensesByCategory).filter(c => !CATEGORY_ORDER.includes(c)))
                const hasTransactions = p.topTransactions.length > 0

                return (
                  <React.Fragment key={p.period}>
                    <tr
                      style={{
                        borderBottom: (!isOpen && idx < projections.length - 1) ? '1px solid rgba(13,61,61,0.04)' : 'none',
                        cursor: hasCategories ? 'pointer' : 'default',
                        backgroundColor: isOpen ? 'rgba(13,61,61,0.015)' : undefined,
                      }}
                      onClick={() => hasCategories && toggle(p.period)}
                    >
                      <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 600, color: '#111827' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {hasCategories
                            ? isOpen
                              ? <ChevronDown size={14} color="rgba(13,61,61,0.4)" />
                              : <ChevronRight size={14} color="rgba(13,61,61,0.4)" />
                            : <span style={{ display: 'inline-block', width: 14 }} />
                          }
                          {p.month}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: 14, color: '#059669', fontWeight: 600 }}>{formatCurrency(p.income, currency)}</td>
                      <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: 14, color: '#666666' }}>{formatCurrency(p.expenses, currency)}</td>
                      <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: 14, color: '#DC2626' }}>{formatCurrency(p.debt, currency)}</td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
                          {p.net > 0 ? <TrendingUp size={14} color="#059669" /> : p.net < 0 ? <TrendingDown size={14} color="#DC2626" /> : <Minus size={14} color="#9ca3af" />}
                          <span style={{ fontSize: 15, fontWeight: 700, color: p.net >= 0 ? '#059669' : '#DC2626' }}>
                            {formatCurrency(p.net, currency)}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            padding: '0 32px 20px 48px',
                            borderBottom: idx < projections.length - 1 ? '1px solid rgba(13,61,61,0.04)' : 'none',
                            backgroundColor: 'rgba(13,61,61,0.015)',
                          }}
                        >
                          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', paddingTop: 12 }}>
                            {sortedCategories.length > 0 && (
                              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(13,61,61,0.35)', marginBottom: 10 }}>
                                  By Category
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {sortedCategories.map(cat => (
                                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
                                      <span style={{ fontSize: 13, color: '#6b7280' }}>{CATEGORY_LABELS[cat] ?? cat}</span>
                                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{formatCurrency(p.expensesByCategory[cat]!, currency)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {sortedCategories.length > 0 && hasTransactions && (
                              <div style={{ width: 1, backgroundColor: 'rgba(13,61,61,0.08)', flexShrink: 0 }} />
                            )}

                            {hasTransactions && (
                              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(13,61,61,0.35)', marginBottom: 10 }}>
                                  Top Expenses
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {p.topTransactions.map((tx, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
                                      <span style={{ fontSize: 13, color: '#374151' }}>• {tx.description}</span>
                                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{formatCurrency(tx.amount, currency)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </YStack>
    </YStack>
  )
}
