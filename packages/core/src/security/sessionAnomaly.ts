/**
 * Metadata captured during a user session event for security analysis.
 */
export interface SessionMetadata {
  /** The originating IP address. */
  ip: string;
  /** Inferred country code (ISO 3166-1 alpha-2) from IP geolocation. */
  country: string | null;
  /** Full User Agent string of the client. */
  userAgent: string;
  /** ISO 8601 timestamp of the event. */
  timestamp: string;
}

/**
 * Result of the anomaly detection heuristic.
 */
export interface AnomalyScore {
  /** Aggregated risk score from 0.0 (safe) to 1.0 (malicious). */
  score: number;
  /** List of detected anomaly codes (e.g., 'geographic_shift'). */
  reasons: string[];
  /** Convenience flag for scores above the high-risk threshold (0.7). */
  highRisk: boolean;
}

/**
 * Pure function to calculate an anomaly score for a new session event
 * based on a user's recent session history.
 * 
 * PSEUDOCODE:
 * 1. Initialize empty reasons list and score at 0.
 * 2. If history is empty, mark as 'first_session' and return score 0.
 * 3. Check for Geographic Shift:
 *    - Compare current country to the most recent known country.
 *    - If they differ, increase score by 0.7 and add reason.
 * 4. Check for Unusual Hours:
 *    - Extract UTC hour from timestamp.
 *    - If hour is between 11 PM and 4 AM, increase score by 0.3 and add reason.
 * 5. Check for New Device:
 *    - Collect all unique User Agents from history.
 *    - If current User Agent is not in the known set, increase score by 0.1 and add reason.
 * 6. Cap final score at 1.0.
 * 7. Return score, reasons, and highRisk flag (true if score >= 0.7).
 * 
 * @param newEvent - The session event currently being evaluated.
 * @param history - Array of previous session metadata for the same user.
 * @returns An AnomalyScore object.
 */
export function calculateAnomalyScore(
  newEvent: SessionMetadata,
  history: SessionMetadata[]
): AnomalyScore {
  const reasons: string[] = [];
  let score = 0;

  // Base case: we cannot reliably detect anomalies without a baseline.
  if (history.length === 0) {
    return { score: 0, reasons: ['first_session'], highRisk: false };
  }

  // 1. Check for country change (High Risk)
  const lastCountry = history[0]?.country;
  if (newEvent.country && lastCountry && newEvent.country !== lastCountry) {
    // Cross-border access is a strong indicator of account takeover or proxy use.
    score += 0.7;
    reasons.push('geographic_shift');
  }

  // 2. Check for unusual hours (Medium Risk)
  // Define "unusual" as 11 PM to 4 AM UTC to catch common automated/off-peak attack windows.
  const hour = new Date(newEvent.timestamp).getUTCHours();
  if (hour >= 23 || hour <= 4) {
    score += 0.3;
    reasons.push('unusual_hour');
  }

  // 3. Check for new User Agent (Low Risk)
  const knownUAs = new Set(history.map((h) => h.userAgent));
  if (!knownUAs.has(newEvent.userAgent)) {
    // New devices are common but contribute slightly to overall risk profile.
    score += 0.1;
    reasons.push('new_device');
  }

  // Cap score at 1 to maintain normalized range.
  score = Math.min(score, 1);

  return {
    score,
    reasons,
    highRisk: score >= 0.7,
  };
}
