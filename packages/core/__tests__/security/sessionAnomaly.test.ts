import { describe, it, expect } from 'vitest';
import { calculateAnomalyScore, type SessionMetadata } from '../../src/security/sessionAnomaly';

describe('Session Anomaly Scoring', () => {
  const history: SessionMetadata[] = [
    {
      ip: '1.1.1.1',
      country: 'PH',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      timestamp: '2026-05-01T10:00:00Z',
    },
  ];

  it('should score 0 for a normal session', () => {
    const newEvent: SessionMetadata = {
      ip: '1.1.1.1',
      country: 'PH',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      timestamp: '2026-05-02T14:00:00Z',
    };

    const result = calculateAnomalyScore(newEvent, history);
    expect(result.score).toBe(0);
    expect(result.highRisk).toBe(false);
  });

  it('should flag a geographic shift as high risk', () => {
    const newEvent: SessionMetadata = {
      ip: '2.2.2.2',
      country: 'US', // PH -> US
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      timestamp: '2026-05-02T14:00:00Z',
    };

    const result = calculateAnomalyScore(newEvent, history);
    expect(result.score).toBeGreaterThanOrEqual(0.7);
    expect(result.reasons).toContain('geographic_shift');
    expect(result.highRisk).toBe(true);
  });

  it('should flag unusual hours', () => {
    const newEvent: SessionMetadata = {
      ip: '1.1.1.1',
      country: 'PH',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      timestamp: '2026-05-02T02:00:00Z', // 2 AM
    };

    const result = calculateAnomalyScore(newEvent, history);
    expect(result.score).toBe(0.3);
    expect(result.reasons).toContain('unusual_hour');
  });

  it('should flag a new device', () => {
    const newEvent: SessionMetadata = {
      ip: '1.1.1.1',
      country: 'PH',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)',
      timestamp: '2026-05-02T14:00:00Z',
    };

    const result = calculateAnomalyScore(newEvent, history);
    expect(result.score).toBe(0.1);
    expect(result.reasons).toContain('new_device');
  });

  it('should accumulate multiple risks', () => {
    const newEvent: SessionMetadata = {
      ip: '2.2.2.2',
      country: 'US',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)',
      timestamp: '2026-05-02T02:00:00Z',
    };

    const result = calculateAnomalyScore(newEvent, history);
    // 0.7 (country) + 0.3 (hour) + 0.1 (UA) = 1.1 -> capped at 1.0
    expect(result.score).toBe(1.0);
    expect(result.reasons).toContain('geographic_shift');
    expect(result.reasons).toContain('unusual_hour');
    expect(result.reasons).toContain('new_device');
    expect(result.highRisk).toBe(true);
  });

  it('should handle empty history gracefully', () => {
    const newEvent: SessionMetadata = {
      ip: '1.1.1.1',
      country: 'PH',
      userAgent: 'UA',
      timestamp: '2026-05-02T14:00:00Z',
    };

    const result = calculateAnomalyScore(newEvent, []);
    expect(result.score).toBe(0);
    expect(result.reasons).toContain('first_session');
  });
});
