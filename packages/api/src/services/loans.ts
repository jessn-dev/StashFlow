import {
  Loan,
  LoanPayment,
  LoanMetrics,
  LoanInterestType,
  convertToBase,
  calculateDTIRatio,
  getRegionByCurrency,
  generateAmortizationSchedule,
  aggregateLoanFinancials,
} from '@stashflow/core';
import { ILoanQuery, IExchangeRateQuery, IProfileQuery, ITransactionQuery, PaymentSummary } from '../queries/interfaces';

/**
 * Represents a single upcoming payment record for the dashboard.
 */
export interface UpcomingPayment {
  /** Unique identifier for the associated loan. */
  loanId: string;
  /** Human-readable name of the loan. */
  loanName: string;
  /** ISO date string of when the payment is due. */
  dueDate: string;
  /** The periodic installment amount. */
  amount: number;
  /** Currency code for the payment. */
  currency: string;
}

/**
 * Represents the comprehensive data required for the main loans dashboard page.
 */
export interface LoansPageData {
  /** Array of all loans belonging to the user. */
  loans: Loan[];
  /** Map of loan-specific metrics keyed by loan ID. */
  loanMetrics: Record<string, LoanMetrics>;
  /** Total debt across all loans in the user's preferred currency. */
  totalDebt: number;
  /** Total monthly payment obligations across all loans. */
  totalMonthlyInstallment: number;
  /** Weighted average interest rate across all active debt. */
  avgInterestRate: number;
  /** Count of loans currently marked as active. */
  activeLoanCount: number;
  /** Calculated Debt-to-Income ratio (0 to 1+). */
  dtiRatio: number;
  /** Whether the DTI ratio is within healthy regional limits. */
  dtiHealthy: boolean;
  /** User's preferred currency code (e.g., 'USD'). */
  currency: string;
  /** Date of the absolute next payment due across all loans. */
  nextPaymentDate: string | null;
  /** Amount of the absolute next payment due across all loans. */
  nextPaymentAmount: number | null;
  /** List of the next few upcoming payments across all active loans. */
  upcomingPayments: UpcomingPayment[];
  /** Smart financial insights and recommendations. */
  insights: Insight[];
}

/**
 * Represents an actionable financial insight for the user.
 */
export interface Insight {
  /** Type of insight for iconography and styling. */
  type: 'warning' | 'info' | 'success' | 'tip';
  /** Human-readable headline. */
  title: string;
  /** Detailed description or recommendation. */
  message: string;
  /** Optional CTA label. */
  actionLabel?: string;
  /** Optional CTA destination. */
  actionHref?: string;
}

/**
 * Service for loan-related business logic and orchestration.
 * Coordinates between multiple query handlers to provide high-level loan insights.
 */
export class LoansService {
  /**
   * Creates an instance of LoansService.
   * 
   * @param loanQuery - Handler for loan and payment data.
   * @param exchangeRateQuery - Handler for currency conversion rates.
   * @param profileQuery - Handler for user settings and preferences.
   * @param transactionQuery - Handler for income data used in DTI calculations.
   */
  constructor(
    private readonly loanQuery: ILoanQuery,
    private readonly exchangeRateQuery: IExchangeRateQuery,
    private readonly profileQuery: IProfileQuery,
    private readonly transactionQuery: ITransactionQuery,
  ) {}

  /**
   * Aggregates all data necessary for the Loans dashboard.
   * 
   * @param userId - Unique identifier of the user.
   * @returns A promise resolving to a complete LoansPageData object.
   * @throws Will throw an error if any underlying data fetch fails.
   */
  async getLoansPageData(userId: string): Promise<LoansPageData> {
    /*
     * PSEUDOCODE:
     * 1. Fetch user profile to determine regional context and currency.
     * 2. Fetch loans, exchange rates, incomes, and payment summaries in parallel.
     * 3. Aggregate high-level financial metrics (total debt, monthly payments).
     * 4. Calculate total monthly income, normalized to the base currency.
     * 5. Compute the Debt-to-Income (DTI) ratio based on regional health rules.
     * 6. Iterate through each loan to calculate detailed metrics:
     *    a. Determine payment progress percentage.
     *    b. Generate/lookup amortization schedule to find the current remaining balance.
     *    c. Identify the next payment due date.
     * 7. Return the consolidated dashboard state.
     */
    const profile = await this.profileQuery.get(userId);
    const currency = profile?.preferred_currency ?? 'USD';
    const region = getRegionByCurrency(currency);

    const [loans, rates, incomes, paymentSummaries] = await Promise.all([
      this.loanQuery.getAll(userId),
      this.exchangeRateQuery.getLatest(),
      this.transactionQuery.getIncomes(userId),
      this.loanQuery.getPaymentSummaries(userId),
    ]);

    // Financial "truth" is calculated in base currency to maintain consistency across the platform.
    const { totalDebt, totalMonthlyInstallment, avgInterestRate, activeLoanCount } =
      aggregateLoanFinancials(loans, rates);

    const monthlyIncome = incomes.reduce((acc, inc) => {
      const rate = rates[inc.currency] ?? 1;
      return acc + convertToBase(inc.amount, rate);
    }, 0);

    const dtiResult = calculateDTIRatio(totalMonthlyInstallment, monthlyIncome, region);

    const summaryByLoanId = new Map<string, PaymentSummary>(
      paymentSummaries.map(s => [s.loanId, s])
    );

    let nextPaymentDate: string | null = null;
    let nextPaymentAmount: number | null = null;
    const upcomingPayments: UpcomingPayment[] = [];

    const loanMetrics: Record<string, LoanMetrics> = {};
    for (const loan of loans) {
      const summary = summaryByLoanId.get(loan.id);
      const paidCount = summary?.paidCount ?? 0;
      const nextDueDate = summary?.nextDueDate ?? null;

      // Track the overall next payment across all loans
      if (nextDueDate && (!nextPaymentDate || nextDueDate < nextPaymentDate)) {
        nextPaymentDate = nextDueDate;
        // Convert to base currency for the aggregate summary metric
        const rate = rates[loan.currency] ?? 1;
        nextPaymentAmount = convertToBase(loan.installment_amount ?? 0, rate);
      }

      if (nextDueDate && loan.status === 'active') {
        upcomingPayments.push({
          loanId: loan.id,
          loanName: loan.name,
          dueDate: nextDueDate,
          amount: loan.installment_amount ?? 0,
          currency: loan.currency,
        });
      }
      
      // Calculate progress relative to the original loan term.
      const paidPercent = loan.duration_months > 0
        ? Math.min(100, Math.round((paidCount / loan.duration_months) * 100))
        : 0;

      let remainingBalance = loan.principal;
      try {
        /*
         * We generate the schedule on-the-fly to ensure remaining balance reflects
         * the amortization curve rather than just subtracting total payments.
         */
        const schedule = generateAmortizationSchedule({
          principal: loan.principal,
          annualInterestRate: loan.interest_rate / 100,
          durationMonths: loan.duration_months,
          startDate: loan.start_date,
          interestType: (loan.interest_type ?? 'Standard Amortized') as LoanInterestType,
          ...(loan.interest_basis ? { interestBasis: loan.interest_basis } : {}),
        });
        
        if (paidCount > 0) {
          const entryIndex = Math.min(paidCount - 1, schedule.entries.length - 1);
          remainingBalance = schedule.entries[entryIndex]?.remainingBalance ?? loan.principal;
        }
      } catch {
        // Fallback to principal if the amortization parameters are invalid or edge cases occur.
      }

      loanMetrics[loan.id] = {
        paidCount,
        paidPercent,
        remainingBalance,
        nextDueDate: summary?.nextDueDate ?? null,
      };
    }

    // Sort upcoming payments by date ascending
    upcomingPayments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const insights: Insight[] = [];

    // 1. High Interest Warning
    const highInterestLoans = loans.filter(l => l.status === 'active' && l.interest_rate > 15);
    if (highInterestLoans.length > 0) {
      insights.push({
        type: 'warning',
        title: 'High Interest Alert',
        message: `You have ${highInterestLoans.length} loan${highInterestLoans.length > 1 ? 's' : ''} with over 15% interest. Prioritizing extra payments here could save you significant interest.`,
      });
    }

    // 2. Upcoming Payment Reminder
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const dueSoon = upcomingPayments.filter(p => new Date(p.dueDate) <= next7Days);
    if (dueSoon.length > 0) {
      insights.push({
        type: 'info',
        title: 'Upcoming Payments',
        message: `You have ${dueSoon.length} payment${dueSoon.length > 1 ? 's' : ''} due in the next 7 days. Ensure your accounts are funded.`,
      });
    }

    // 3. Debt Health Tip
    if (dtiResult.isHealthy && activeLoanCount > 0) {
      insights.push({
        type: 'success',
        title: 'Healthy Debt Load',
        message: 'Your debt-to-income ratio is within recommended limits. You are in a good position to accelerate your payoff.',
      });
    }

    return {
      loans,
      loanMetrics,
      totalDebt,
      totalMonthlyInstallment,
      avgInterestRate,
      activeLoanCount,
      dtiRatio: dtiResult.ratio,
      dtiHealthy: dtiResult.isHealthy,
      currency,
      nextPaymentDate,
      nextPaymentAmount,
      upcomingPayments: upcomingPayments.slice(0, 3),
      insights,
    };
  }

  /**
   * Retrieves detailed information and payment history for a specific loan.
   * 
   * @param loanId - Unique identifier of the loan.
   * @param userId - Unique identifier of the owner (for security validation).
   * @returns A promise resolving to the loan and its payments, or null if not found.
   * @throws Will throw an error if the database query fails.
   */
  async getLoanDetail(loanId: string, userId: string): Promise<{ loan: Loan; payments: LoanPayment[] } | null> {
    const loan = await this.loanQuery.getById(loanId, userId);
    if (!loan) {
      // Return null rather than throwing to allow the UI to handle 404s gracefully.
      return null;
    }

    const payments = await this.loanQuery.getPayments(loanId);
    return { loan, payments };
  }
}

