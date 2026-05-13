/**
 * Props for the SnapshotCard component.
 */
type SnapshotCardProps = Readonly<{
  /** The descriptive label for the metric (e.g., "Net Worth"). */
  label: string;
  /** The primary value to display, typically formatted currency. */
  value: string;
  /** Optional secondary value in base currency for cross-currency comparison. */
  baseValue?: string | undefined;
  /** Optional supporting text or context displayed below the primary value. */
  supporting?: string | undefined;
  /** Optional CSS class for coloring the primary value text. */
  valueColor?: string | undefined;
  /** Optional status indicator showing 'healthy' (green) or 'warning' (amber). */
  indicator?: 'healthy' | 'warning' | undefined;
}>;

/**
 * A consistent, high-fidelity metric card used across the StashFlow dashboard
 * to display key financial indicators at a glance.
 * 
 * @param props - Component properties.
 * @returns A rendered JSX element representing a financial snapshot card.
 */
export function SnapshotCard({
  label,
  value,
  baseValue,
  supporting,
  valueColor = 'text-gray-900',
  indicator,
}: SnapshotCardProps) {
  /*
   * PSEUDOCODE:
   * 1. Render a container with fixed height and consistent padding/styling.
   * 2. Render the top row containing the label and the status indicator dot.
   * 3. Render the primary value with the specified or default color.
   * 4. Render optional base value and supporting text if provided.
   */
  return (
    <div
      className="bg-white rounded-[20px] border border-gray-200 shadow-sm flex flex-col justify-between"
      style={{ minHeight: '112px', padding: '20px' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-gray-400 leading-tight">{label}</p>
        {indicator && (
          /* INDICATOR: Visually signals the health of the metric based on business thresholds. */
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              indicator === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
        )}
      </div>
      <div>
        <p
          className={`font-bold tabular-nums leading-none mb-1 ${valueColor}`}
          style={{ fontSize: '28px', letterSpacing: '-0.02em' }}
        >
          {value}
        </p>
        {baseValue && (
           /* BASE VALUE: Used for multi-currency support to show normalized value. */
           <p className="text-[11px] text-gray-400 font-medium mb-1">≈ {baseValue}</p>
        )}
        {supporting && (
          <p className="text-[12px] text-gray-400 leading-tight">{supporting}</p>
        )}
      </div>
    </div>
  );
}
