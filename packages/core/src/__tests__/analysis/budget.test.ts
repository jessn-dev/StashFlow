import { describe, it, expect } from 'vitest';
import { generateSmartBudget } from '../../analysis/budget';

describe('budget analysis', () => {
  it('should generate recommendations following 50/30/20 rule', () => {
    const income = 1000;
    const recommendations = generateSmartBudget(income);

    const essentialRecommendations = recommendations.filter(r => r.isEssential);
    const wantsRecommendations = recommendations.filter(r => !r.isEssential);

    const essentialTotal = essentialRecommendations.reduce((acc, r) => acc + r.suggestedAmount, 0);
    const wantsRecommendationsOnly = wantsRecommendations.filter(r => r.category !== 'savings');
    const wantsTotal = wantsRecommendationsOnly.reduce((acc, r) => acc + r.suggestedAmount, 0);
    const savingsRecommendation = wantsRecommendations.find(r => r.category === 'savings');

    expect(essentialTotal).toBeCloseTo(500, 1);
    expect(wantsTotal).toBeCloseTo(300, 1);
    expect(savingsRecommendation?.suggestedAmount).toBeCloseTo(200, 1);
  });
});
