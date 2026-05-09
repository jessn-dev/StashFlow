export interface SessionMetadata {
  ip: string;
  country: string | null;
  userAgent: string;
  timestamp: string; // ISO string
}

export interface AnomalyScore {
  score: number; // 0–1
  reasons: string[];
  highRisk: boolean;
}

/**
 * Pure function to calculate an anomaly score for a new session event
 * based on a user's recent session history.
 */
export function calculateAnomalyScore(
  newEvent: SessionMetadata,
  history: SessionMetadata[]
): AnomalyScore {
  const reasons: string[] = [];
  let score = 0;

  if (history.length === 0) {
    return { score: 0, reasons: ['first_session'], highRisk: false };
  }

  // 1. Check for country change (High Risk)
  const lastCountry = history[0]?.country;
  if (newEvent.country && lastCountry && newEvent.country !== lastCountry) {
    score += 0.7;
    reasons.push('geographic_shift');
  }

  // 2. Check for unusual hours (Medium Risk)
  // Define "unusual" as 11 PM to 4 AM UTC
  const hour = new Date(newEvent.timestamp).getUTCHours();
  if (hour >= 23 || hour <= 4) {
    score += 0.3;
    reasons.push('unusual_hour');
  }

  // 3. Check for new User Agent (Low Risk)
  const knownUAs = new Set(history.map((h) => h.userAgent));
  if (!knownUAs.has(newEvent.userAgent)) {
    score += 0.1;
    reasons.push('new_device');
  }

  // Cap score at 1
  score = Math.min(score, 1);

  return {
    score,
    reasons,
    highRisk: score >= 0.7,
  };
}
