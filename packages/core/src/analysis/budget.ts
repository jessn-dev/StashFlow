import { ExpenseCategory, Constants } from '../schema/mod.ts';

/**
 * Represents a specific budget allocation recommendation for an expense category.
 */
export interface BudgetRecommendation {
  /** The expense category (e.g., 'housing', 'food'). */
  category: ExpenseCategory;
  /** The suggested monetary amount to allocate to this category. */
  suggestedAmount: number;
  /** Whether this category is considered an essential 'Need' vs a 'Want'. */
  isEssential: boolean;
}

/**
 * Categories prioritized as 'Needs' in the 50/30/20 framework.
 */
const ESSENTIAL_CATEGORIES: ExpenseCategory[] = [
  'housing',
  'food',
  'transport',
  'utilities',
  'healthcare',
];

/**
 * Generates a smart budget based on income and the 50/30/20 allocation rule.
 * 
 * PSEUDOCODE:
 * 1. Calculate the total pool for Essentials (50% of income).
 * 2. Calculate the total pool for Wants (30% of income).
 * 3. Identify all available expense categories from constants.
 * 4. Split categories into 'Essential' and 'Wants' lists.
 * 5. For each Essential category:
 *    a. Use custom allocation if provided, otherwise divide the Essentials pool equally.
 *    b. Add to recommendations as isEssential: true.
 * 6. For each Want category:
 *    a. Use custom allocation if provided, otherwise divide the Wants pool equally.
 *    b. Add to recommendations as isEssential: false.
 * 7. Return the full list of recommendations.
 * 
 * @param monthlyIncome - The total monthly net income to be budgeted.
 * @param customAllocations - Optional overrides for specific categories.
 * @returns An array of BudgetRecommendation objects.
 * @throws Never - Returns empty array if no categories are found.
 */
export function generateSmartBudget(
  monthlyIncome: number,
  customAllocations?: Partial<Record<ExpenseCategory, number>>
): BudgetRecommendation[] {
  const essentialsTotal = monthlyIncome * 0.50;
  const wantsTotal = monthlyIncome * 0.30;
  
  // Using type assertion as Constants are defined in a generic schema structure.
  const allCategories = Constants.public.Enums.expense_category as unknown as ExpenseCategory[];
  const wantsCategories = allCategories.filter((cat) => !ESSENTIAL_CATEGORIES.includes(cat));

  const essentialCount = ESSENTIAL_CATEGORIES.length;
  const wantsCount = wantsCategories.length;

  const recommendations: BudgetRecommendation[] = [];

  ESSENTIAL_CATEGORIES.forEach((cat) => {
    recommendations.push({
      category: cat,
      suggestedAmount: customAllocations?.[cat] ?? essentialsTotal / essentialCount,
      isEssential: true,
    });
  });

  wantsCategories.forEach((cat) => {
    recommendations.push({
      category: cat,
      suggestedAmount: customAllocations?.[cat] ?? wantsTotal / wantsCount,
      isEssential: false,
    });
  });

  return recommendations;
}
