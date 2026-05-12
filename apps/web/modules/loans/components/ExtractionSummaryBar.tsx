/**
 * @module ExtractionSummaryBar
 * Displays a visual indicator of the AI's extraction confidence and lists any validation errors.
 * This helps users understand which fields might require more scrutiny during the review process.
 */

/** Metadata regarding the validation status of the extracted document data. */
interface ValidationMetadata {
  /** Numerical score from 0.0 to 1.0 representing AI certainty. */
  confidence: number;
  /** List of specific error messages identified during automated validation. */
  errors: string[];
  /** Flag indicating if the document requires manual human verification. */
  requires_verification: boolean;
  /** ISO timestamp of when the extraction was performed. */
  processed_at: string;
}

/** Properties for the ExtractionSummaryBar component. */
interface ExtractionSummaryBarProps {
  /** The raw extracted data object. */
  data: any;
  /** Optional validation metadata from the backend. */
  validation?: ValidationMetadata;
  /** The type of extraction being summarized. */
  type: 'LOAN' | 'STATEMENT';
  /** If true, forces the UI to show a low-confidence state (used during edits). */
  forceLow?: boolean;
}

/** 
 * Weights assigned to loan fields to estimate confidence when backend score is missing.
 * Principal and Interest Rate are weighted highest as they are critical for financial math.
 */
const LOAN_FIELD_WEIGHTS: Record<string, number> = {
  principal: 0.25,
  interest_rate: 0.20,
  duration_months: 0.15,
  installment_amount: 0.10,
  currency: 0.10,
  start_date: 0.08,
  name: 0.05,
  lender: 0.04,
  interest_type: 0.02,
  interest_basis: 0.01,
};

/**
 * Heuristic function to estimate extraction confidence based on field presence.
 * 
 * @param {any} data - The extracted loan data.
 * @returns {number} A confidence score between 0 and 1.
 */
function computeLoanConfidence(data: any): number {
  /*
   * PSEUDOCODE:
   * 1. Check if data object exists.
   * 2. Iterate through LOAN_FIELD_WEIGHTS.
   * 3. Add the weight of each non-null field found in data to a running sum.
   * 4. Return the sum as a decimal representation of "completeness".
   */
  if (!data) return 0;
  let sum = 0;
  for (const [key, weight] of Object.entries(LOAN_FIELD_WEIGHTS)) {
    if (data[key] != null) {
      sum += weight;
    }
  }
  return sum;
}

/**
 * Maps a numerical confidence score to a UI theme configuration.
 * 
 * @param {number} score - Confidence score (0-1).
 * @returns {Object} UI configuration including labels and colors.
 */
function getConfidenceConfig(score: number) {
  if (score >= 0.85) return {
    label: 'High',
    bg: '#ECFDF5',
    border: '#10B981',
    badgeBg: '#D1FAE5',
    textColor: '#065F46',
  };
  if (score >= 0.70) return {
    label: 'Medium',
    bg: '#FFFBEB',
    border: '#F59E0B',
    badgeBg: '#FEF3C7',
    textColor: '#92400E',
  };
  return {
    label: 'Low',
    bg: '#FEF2F2',
    border: '#EF4444',
    badgeBg: '#FEE2E2',
    textColor: '#991B1B',
  };
}

/**
 * Summary bar showing AI extraction confidence and any validation errors.
 * 
 * @param {ExtractionSummaryBarProps} props - Component props.
 * @returns {JSX.Element} The rendered summary bar.
 */
export function ExtractionSummaryBar({
  data,
  validation,
  type,
  forceLow,
}: ExtractionSummaryBarProps) {
  /*
   * PSEUDOCODE:
   * 1. Determine the effective confidence score using:
   *    a. forceLow flag (if true, score is 0).
   *    b. backend validation score (if available).
   *    c. manual heuristic calculation for loans.
   *    d. default 0.8 for statements.
   * 2. Retrieve the UI configuration (colors, labels) based on the score.
   * 3. Render the confidence badge and optional "Needs Verification" warning.
   * 4. If validation errors exist, render an error list below the main bar.
   */
  const score = forceLow ? 0 : (validation?.confidence ?? (type === 'LOAN' ? computeLoanConfidence(data) : 0.8));
  const cfg = forceLow ? getConfidenceConfig(0) : getConfidenceConfig(score);

  return (
    <div className="flex flex-col gap-2 mb-4">
      <div
        className="rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
      >
        <div className="flex items-center gap-4 text-sm flex-wrap" style={{ color: cfg.textColor }}>
          {/* We use emojis for quick visual scannability of AI trust levels */}
          <span>✨ AI Analysis {cfg.label}</span>
          {validation?.requires_verification && <span>⚠️ Needs Verification</span>}
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: cfg.badgeBg, color: cfg.textColor }}
        >
          Confidence: {cfg.label}
        </span>
      </div>
      {/* 
          Validation errors are displayed in a separate box to ensure they aren't missed 
          during the financial "truth" verification step. 
      */}
      {validation?.errors && validation.errors.length > 0 && (
        <div className="rounded-xl px-4 py-3 bg-red-50 border border-red-200">
          <p className="text-xs font-bold text-red-800 mb-1 uppercase tracking-wider">Validation Errors</p>
          <ul className="list-disc pl-5 text-sm text-red-700 space-y-1">
            {validation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
