import Link from 'next/link';
import type { IntelligenceItem, IntelligenceType } from '@stashflow/core';

const TYPE_CONFIG: Record<
  IntelligenceType,
  { label: string; icon: string; bg: string; border: string; badge: string; text: string }
> = {
  attention: {
    label: 'Attention Required',
    icon: '⚠',
    bg: '#FFFBEB',
    border: '#FDE68A',
    badge: '#FEF3C7',
    text: '#92400E',
  },
  health: {
    label: 'Financial Health',
    icon: '◉',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    badge: '#DCFCE7',
    text: '#166534',
  },
  trend: {
    label: 'Trend',
    icon: '↗',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    badge: '#DBEAFE',
    text: '#1E40AF',
  },
  forecast: {
    label: 'Forecast',
    icon: '◈',
    bg: '#FAF5FF',
    border: '#E9D5FF',
    badge: '#F3E8FF',
    text: '#6B21A8',
  },
  anomaly: {
    label: 'Risk',
    icon: '◆',
    bg: '#FFF1F2',
    border: '#FECDD3',
    badge: '#FFE4E6',
    text: '#9F1239',
  },
};

/**
 * Determines the visual configuration for an intelligence item.
 * 
 * @param item - The intelligence item to evaluate.
 * @returns An object containing style and label configuration.
 */
function getConfig(item: IntelligenceItem) {
  // BUSINESS RULE: High-priority health alerts use a stronger "Risk" styling
  // to grab the user's attention immediately.
  if (item.type === 'health' && item.priority === 'high') {
    return {
      label: 'Financial Health',
      icon: '◉',
      bg: '#FFF1F2',
      border: '#FECDD3',
      badge: '#FFE4E6',
      text: '#9F1239',
    };
  }
  return TYPE_CONFIG[item.type];
}

/**
 * Renders an individual intelligence insight card.
 * 
 * @param props - Component properties.
 * @param props.item - The intelligence data item.
 */
function IntelligenceCard({ item }: Readonly<{ item: IntelligenceItem }>) {
  const cfg = getConfig(item);

  return (
    <div
      className="rounded-3xl overflow-hidden transition-shadow hover:shadow-md"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        padding: '24px',
        borderRadius: '24px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: cfg.badge, color: cfg.text }}
          >
            {cfg.icon} {cfg.label}
          </span>
        </div>
        {item.priority === 'high' && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            High Priority
          </span>
        )}
      </div>

      {/* Summary */}
      <p
        className="font-semibold text-gray-900 leading-snug mb-2"
        style={{ fontSize: '18px', lineHeight: '1.4' }}
      >
        {item.summary}
      </p>

      {/* Context */}
      {item.context && (
        <p className="text-sm text-gray-500 mb-4" style={{ lineHeight: '1.5' }}>
          {item.context}
        </p>
      )}

      {/* Actions */}
      {item.actions && item.actions.length > 0 && (
        <div className="flex items-center gap-3 mt-3">
          {item.actions.map((action, i) => (
            <Link
              key={action.href}
              href={action.href}
              className={`text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${
                i === 0
                  ? 'bg-gray-900 text-white hover:bg-gray-800'
                  : 'text-gray-600 hover:text-gray-800 border border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Properties for the IntelligenceFeed component.
 */
type Props = Readonly<{
  /** Array of intelligence insights to display. */
  items: IntelligenceItem[];
}>;

/**
 * Renders a feed of financial intelligence insights and alerts.
 * 
 * @param props - Component properties.
 * @returns A JSX element containing the intelligence feed.
 */
export function IntelligenceFeed({ items }: Props) {
  /*
   * PSEUDOCODE:
   * 1. Check if the items array is empty.
   * 2. If empty, render a centered empty state with guidance.
   * 3. If items exist, render a vertical stack of IntelligenceCard components.
   * 4. Map each item ID to a card to maintain stable list rendering.
   */
  if (items.length === 0) {
    return (
      <div
        className="rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center"
        style={{ minHeight: '320px', padding: '48px' }}
      >
        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl mb-4">
          ✦
        </div>
        <p className="text-base font-semibold text-gray-900 mb-1">
          Your intelligence feed is empty.
        </p>
        <p className="text-sm text-gray-400 max-w-xs">
          Add transactions and loans to start generating financial insights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <IntelligenceCard key={item.id} item={item} />
      ))}
    </div>
  );
}
