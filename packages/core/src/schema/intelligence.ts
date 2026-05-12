export type IntelligenceType = 'attention' | 'health' | 'trend' | 'forecast' | 'anomaly';
export type IntelligencePriority = 'high' | 'medium' | 'low';

/**
 * Represents a single item in the financial intelligence feed.
 */
export interface IntelligenceItem {
  id: string;
  type: IntelligenceType;
  priority: IntelligencePriority;
  summary: string;
  context?: string;
  actions?: { label: string; href: string }[];
}
