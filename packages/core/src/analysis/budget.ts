import { ExpenseCategory, Constants } from '../schema';

export interface BudgetRecommendation {
  category: ExpenseCategory;
  suggestedAmount: number;
  isEssential: boolean;
}

const ESSENTIAL_CATEGORIES: ExpenseCategory[] = [
  'housing',
  'food',
  'transport',
  'utilities',
  'healthcare',
];

/**
 * Generates a smart budget based on income and common allocation rules (e.g., 50/30/20).
 * 50% Essentials, 30% Wants, 20% Savings/Debt.
 */
export function generateSmartBudget(
  monthlyIncome: number,
  customAllocations?: Partial<Record<ExpenseCategory, number>>
): BudgetRecommendation[] {
  const essentialsTotal = monthlyIncome * 0.50;
  const wantsTotal = monthlyIncome * 0.30;
  const savingsTotal = monthlyIncome * 0.20;
  
  // Dynamically determine wants by excluding essentials and savings from all categories
  const allCategories = Constants.public.Enums.expense_category as unknown as ExpenseCategory[];
  const wantsCategories = allCategories.filter(
    (cat) => !ESSENTIAL_CATEGORIES.includes(cat) && cat !== 'savings'
  );

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

  recommendations.push({
    category: 'savings',
    suggestedAmount: customAllocations?.['savings'] ?? savingsTotal,
    isEssential: false,
  });

  return recommendations;
}
