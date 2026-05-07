import Link from 'next/link';

export type IntelligenceType = 'attention' | 'health' | 'trend' | 'forecast' | 'anomaly';
export type IntelligencePriority = 'high' | 'medium' | 'low';

export interface IntelligenceItem {
  id: string;
  type: IntelligenceType;
  priority: IntelligencePriority;
  summary: string;
  context?: string;
  actions?: { label: string; href: string }[];
}

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

// High-priority attention items use a stronger red tint
function getConfig(item: IntelligenceItem) {
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

function IntelligenceCard({ item }: { item: IntelligenceItem }) {
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

interface Props {
  items: IntelligenceItem[];
}

export function IntelligenceFeed({ items }: Props) {
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
