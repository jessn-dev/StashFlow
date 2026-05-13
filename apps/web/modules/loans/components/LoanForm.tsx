'use client';

/**
 * @module LoanForm
 * Provides a comprehensive interface for reviewing, editing, and saving loan data.
 * It includes real-time financial inference, amortization previews, and 
 * data provenance tracking (highlighting where data was found in a source document).
 */

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '~/lib/supabase/client';
import { generateAmortizationSchedule, formatCurrency, inferLoanStructure, computeAddOnEIR } from '@stashflow/core';
import type { LoanInterestType, LoanInterestBasis, LoanInferenceResult } from '@stashflow/core';

/** Data structure for the loan form state. */
export interface LoanFormValues {
  name: string;
  principal: string;
  currency: string;
  interest_rate: string;
  duration_months: string;
  interest_type: string;
  interest_basis: string;
  start_date: string;
  lender: string;
  installment_amount: string;
}

const INTEREST_TYPES = ['Standard Amortized', 'Interest-Only', 'Add-on Interest', 'Fixed Principal'];
const INTEREST_BASES = ['30/360', 'Actual/360', 'Actual/365'];
const CURRENCIES = ['USD', 'PHP', 'SGD', 'EUR', 'GBP'];

/** Fields required for the form to be considered "savable". */
const REQUIRED_KEYS = new Set(['name', 'principal', 'interest_rate', 'duration_months', 'start_date']);

/** Types of status tags displayed next to form fields. */
type TagType = 'auto-filled' | 'missing' | 'needs-review';

/**
 * Visual badge indicating the status of a form field.
 * 
 * @param {Object} props - Component props.
 * @param {TagType} props.type - The status type of the field.
 * @returns {JSX.Element} A colored badge component.
 */
function FieldTag({ type }: Readonly<{ type: TagType }>) {
  if (type === 'auto-filled') {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 whitespace-nowrap flex-shrink-0">
        Auto-filled
      </span>
    );
  }
  if (type === 'missing') {
    return (
      <span className="text-xs font-medium text-red-500 whitespace-nowrap flex-shrink-0">
        Required
      </span>
    );
  }
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 whitespace-nowrap flex-shrink-0">
      Needs review
    </span>
  );
}

/**
 * Logic to determine which tag should be shown for a given field.
 * 
 * @param {string} key - The form field key.
 * @param {string[]} extractedFields - List of fields successfully extracted by AI.
 * @returns {TagType | null} The calculated tag type.
 */
function getTag(key: string, extractedFields: string[]): TagType | null {
  if (extractedFields.includes(key)) return 'auto-filled';
  if (REQUIRED_KEYS.has(key)) return 'missing';
  return null;
}

/** Properties for the LoanForm component. */
type LoanFormProps = Readonly<{
  /** Initial values for the form fields (e.g., from AI extraction). */
  initial?: Partial<LoanFormValues> | undefined;
  /** ID of the source document, if this loan was extracted. */
  docId?: string | undefined;
  /** Heading title for the form section. */
  title?: string | undefined;
  /** List of field names that were auto-populated by AI. */
  extractedFields?: string[] | undefined;
  /** Mapping of fields to their source locations (page/snippet) in the document. */
  provenance?: Record<string, { page?: number; snippet?: string }> | undefined;
}>;

/**
 * A layout component for a form row that includes label, input, and provenance tooltips.
 */
function FieldRow({
  fieldKey,
  label,
  extractedFields,
  provenance,
  children,
}: Readonly<{
  fieldKey: string;
  label: string;
  extractedFields: string[];
  provenance?: Record<string, { page?: number; snippet?: string }> | undefined;
  children: React.ReactNode;
}>) {
  const tag = getTag(fieldKey, extractedFields);
  const prov = provenance?.[fieldKey];

  return (
    <div className="relative group/field">
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        {children}
        {tag && <FieldTag type={tag} />}
      </div>
      
      {/* 
          Provenance Snippets:
          We display the original text snippet from the PDF to allow users to 
          instantly verify AI-extracted numbers against the source of truth.
      */}
      {prov?.snippet && (
        <div className="mt-1.5 opacity-0 group-hover/field:opacity-100 transition-opacity pointer-events-none absolute z-30 left-0 right-0 top-full">
           <div className="bg-[#0A2540] text-white p-3 rounded-xl shadow-2xl border border-white/10 text-[10px] leading-relaxed">
             <div className="flex items-center justify-between mb-1.5 border-b border-white/10 pb-1.5">
               <span className="font-black uppercase tracking-widest text-[8px] text-blue-300">Source Evidence</span>
               {prov.page && <span className="bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-200 font-bold">Page {prov.page}</span>}
             </div>
             <p className="italic text-gray-300">“{prov.snippet}”</p>
           </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper to calculate the estimated loan completion date.
 * 
 * @param {string} startDate - The ISO start date.
 * @param {number} months - Duration in months.
 * @returns {string} Formatted month/year string.
 */
function formatPayoffDate(startDate: string, months: number): string {
  try {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

/**
 * Comprehensive loan entry and review form.
 * 
 * @param {LoanFormProps} props - Component props.
 * @returns {JSX.Element} The rendered form.
 */
export function LoanForm({ initial = {}, docId, extractedFields = [], provenance, title = 'Loan Details' }: LoanFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<LoanFormValues>({
    name: initial.name ?? '',
    principal: initial.principal ?? '',
    currency: initial.currency ?? 'USD',
    interest_rate: initial.interest_rate ?? '',
    duration_months: initial.duration_months ?? '',
    interest_type: initial.interest_type ?? 'Standard Amortized',
    interest_basis: initial.interest_basis ?? '30/360',
    start_date: initial.start_date ?? new Date().toISOString().slice(0, 10),
    lender: initial.lender ?? '',
    installment_amount: initial.installment_amount ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [hasEdited, setHasEdited] = useState(false);
  const [durationUnit, setDurationUnit] = useState<'months' | 'years'>('months');
  const [isSaved, setIsSaved] = useState(false);
  const [userOverrodeInterestType, setUserOverrodeInterestType] = useState(
    () => extractedFields.includes('interest_type'),
  );

  const field = (key: keyof LoanFormValues) => ({
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setHasEdited(true);
      setValues(v => ({ ...v, [key]: e.target.value }));
    },
  });

  /*
   * PSEUDOCODE: Financial Inference
   * 1. Extract numerical values from the form state.
   * 2. Determine country context from currency (used for regional lending norms).
   * 3. Pass values to inferLoanStructure to guess the interest type (e.g., identifying Add-on interest).
   * 4. Update the form's interest_type automatically if confidence is high and user hasn't manualy overridden it.
   */
  const inference = useMemo((): LoanInferenceResult => {
    const p = Number.parseFloat(values.principal);
    const m = Number.parseFloat(values.installment_amount);
    const r = Number.parseFloat(values.interest_rate);
    const n = Number.parseInt(values.duration_months);
    const country =
      values.currency === 'PHP' ? 'PH' :
      values.currency === 'USD' ? 'US' :
      values.currency === 'SGD' ? 'SG' : null;
    return inferLoanStructure({
      principal: Number.isNaN(p) || p <= 0 ? null : p,
      monthly_payment: Number.isNaN(m) || m <= 0 ? null : m,
      interest_rate_annual: Number.isNaN(r) || r <= 0 ? null : r,
      term_months: Number.isNaN(n) || n <= 0 ? null : n,
      country,
    });
  }, [values.principal, values.installment_amount, values.interest_rate, values.duration_months, values.currency]);

  useEffect(() => {
    // If the user has manually changed the interest type, we stop auto-guessing.
    if (userOverrodeInterestType) return;
    if (inference.confidence >= 0.60) {
      setValues(v => ({ ...v, interest_type: inference.interest_type }));
    }
  }, [inference, userOverrodeInterestType]);

  /*
   * PSEUDOCODE: Amortization Snapshot
   * 1. Validate that basic loan parameters (principal, rate, duration) are present and positive.
   * 2. Use the core library to generate a theoretical amortization schedule.
   * 3. This snapshot is used for UI previews (e.g., total interest) before the user saves.
   */
  const snapshot = useMemo(() => {
    const principal = Number.parseFloat(values.principal);
    const rate = Number.parseFloat(values.interest_rate);
    const months = Number.parseInt(values.duration_months);
    if (!principal || !rate || !months || principal <= 0 || rate <= 0 || months <= 0) {
      return null;
    }
    try {
      return generateAmortizationSchedule({
        principal,
        annualInterestRate: rate / 100,
        durationMonths: months,
        startDate: values.start_date,
        interestType: values.interest_type as LoanInterestType,
      });
    } catch {
      return null;
    }
  }, [values.principal, values.interest_rate, values.duration_months, values.start_date, values.interest_type]);

  /*
   * PSEUDOCODE: Submission Logic
   * 1. Prevent default form action and set loading state.
   * 2. Authenticate the user session.
   * 3. Insert the loan record into Supabase with parsed numerical values.
   * 4. If successful and a docId exists, link the document to the new loan record.
   * 5. Trigger a redirect or success state.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated.'); setSubmitting(false); return; }

    const { data: loan, error: insertError } = await supabase.from('loans').insert({
      user_id: user.id,
      name: values.name,
      principal: Number.parseFloat(values.principal),
      currency: values.currency,
      interest_rate: Number.parseFloat(values.interest_rate),
      duration_months: Number.parseInt(values.duration_months),
      interest_type: values.interest_type as LoanInterestType,
      interest_basis: values.interest_basis as LoanInterestBasis,
      start_date: values.start_date,
      end_date: (() => {
        const d = new Date(values.start_date);
        d.setMonth(d.getMonth() + (Number.parseInt(values.duration_months) || 0));
        return d.toISOString().slice(0, 10);
      })(),
      lender: values.lender || null,
      installment_amount: Number.parseFloat(values.installment_amount) || 0,
      status: 'active' as const,
      source_document_id: docId || null,
    }).select('id').single();

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    if (docId) {
      await supabase
        .from('documents')
        .update({ loan_id: loan?.id ?? null })
        .eq('id', docId);
    }

    setIsSaved(true);
    setSubmitting(false);
    
    if (!docId) {
      router.push(`/dashboard/loans/${loan?.id}`);
      router.refresh();
    }
  };

  if (isSaved) {
    return (
      <div className="py-12 px-6 text-center bg-emerald-50/50 rounded-2xl border border-emerald-100 mb-10 animate-in fade-in zoom-in duration-500">
         <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xl mx-auto mb-4 shadow-lg shadow-emerald-100">✓</div>
         <h3 className="text-lg font-bold text-emerald-900">Loan Saved Successfully</h3>
         <p className="text-sm text-emerald-700 mt-1 mb-6">This loan has been added to your dashboard.</p>
         <div className="flex gap-4 justify-center">
            <Link 
              href="/dashboard/loans"
              className="px-4 py-2 bg-white border border-emerald-200 rounded-lg text-sm font-bold text-emerald-600 hover:bg-emerald-100 transition-colors"
            >
              View all loans
            </Link>
         </div>
      </div>
    );
  }

  const inputClass = 'flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors bg-white';

  /*
   * PSEUDOCODE: Dynamic Calculations for UI
   * 1. Prioritize the installment_amount extracted from the document over computed values
   *    because lenders often use internal rounding or conventions (EIR) that standard
   *    amortization formulas won't match exactly.
   * 2. Calculate Effective Interest Rate (EIR) if the type is 'Add-on Interest'.
   * 3. Construct the snapshot items for the UI summary cards.
   */
  const statedMonthly = Number.parseFloat(values.installment_amount) || 0;
  const durationMonths = Number.parseInt(values.duration_months) || 0;
  const principalAmt = Number.parseFloat(values.principal) || 0;
  const effectiveMonthly = statedMonthly > 0 ? statedMonthly : (snapshot?.monthlyPayment ?? null);
  const effectiveTotalCost = effectiveMonthly != null && durationMonths > 0
    ? effectiveMonthly * durationMonths
    : snapshot != null ? principalAmt + snapshot.totalInterest : null;
  const monthlyPayment = effectiveMonthly;
  const totalInterest = effectiveTotalCost != null && principalAmt > 0
    ? effectiveTotalCost - principalAmt
    : (snapshot?.totalInterest ?? null);
  const payoffDate = (snapshot || statedMonthly > 0)
    ? formatPayoffDate(values.start_date, durationMonths)
    : '—';

  const eirPct = (() => {
    const r = Number.parseFloat(values.interest_rate);
    const n = Number.parseInt(values.duration_months);
    if (values.interest_type !== 'Add-on Interest' || Number.isNaN(r) || r <= 0 || Number.isNaN(n) || n <= 0) return null;
    return computeAddOnEIR(r, n).toFixed(2) + '% p.a.';
  })();

  const snapshotItems = [
    {
      label: 'Monthly Payment',
      value: monthlyPayment != null ? formatCurrency(monthlyPayment, values.currency) : '—',
    },
    {
      label: 'Total Interest',
      value: totalInterest != null ? formatCurrency(totalInterest, values.currency) : '—',
    },
    { label: 'Payoff Date', value: payoffDate },
    ...(eirPct ? [{ label: 'Effective Rate', value: eirPct }] : []),
  ];

  return (
    <form onSubmit={handleSubmit}>
      {/* Financial Snapshot */}
      <div className={`grid gap-4 mb-6 ${snapshotItems.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
        {snapshotItems.map(({ label, value }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: '#F9FAFB' }}>
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-1.5">{label}</p>
            <p className="text-lg font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Inline guidance — hidden after first edit */}
      {!hasEdited && extractedFields.length > 0 && (
        <div className="mb-5 space-y-0.5">
          <p className="text-xs text-gray-400">You can edit any auto-filled value before saving.</p>
          <p className="text-xs text-gray-400">Nothing is saved until you confirm.</p>
        </div>
      )}

      {/* Section 1: Core Loan Details */}
      <p className="text-base font-semibold text-gray-900 mb-4">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="sm:col-span-2">
          <FieldRow fieldKey="name" label="Loan Name" extractedFields={extractedFields} provenance={provenance}>
            <input
              required
              className={inputClass}
              placeholder="e.g. Home Loan, Car Loan"
              {...field('name')}
            />
          </FieldRow>
        </div>

        <FieldRow fieldKey="principal" label="Principal Amount" extractedFields={extractedFields} provenance={provenance}>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            placeholder="0.00"
            {...field('principal')}
          />
        </FieldRow>

        <FieldRow fieldKey="currency" label="Currency" extractedFields={extractedFields} provenance={provenance}>
          <select className={inputClass} {...field('currency')}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FieldRow>

        <FieldRow fieldKey="interest_rate" label="Annual Interest Rate (%)" extractedFields={extractedFields} provenance={provenance}>
          <input
            required
            type="number"
            min="0"
            max="100"
            step="0.01"
            className={inputClass}
            placeholder="e.g. 5.5"
            {...field('interest_rate')}
          />
        </FieldRow>

        <FieldRow fieldKey="duration_months" label="Duration" extractedFields={extractedFields} provenance={provenance}>
          <input
            required
            type="number"
            min="1"
            step="1"
            className={inputClass}
            placeholder={durationUnit === 'years' ? 'e.g. 30' : 'e.g. 360'}
            value={
              durationUnit === 'years' && values.duration_months !== ''
                ? String(Math.round(Number.parseInt(values.duration_months) / 12) || '')
                : values.duration_months
            }
            onChange={e => {
              setHasEdited(true);
              const raw = e.target.value;
              const months = durationUnit === 'years'
                ? String(Number.parseInt(raw) * 12 || '')
                : raw;
              setValues(v => ({ ...v, duration_months: months }));
            }}
          />
          <select
            value={durationUnit}
            onChange={e => {
              const next = e.target.value as 'months' | 'years';
              setDurationUnit(next);
            }}
            className="h-10 px-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors bg-white text-gray-600 flex-shrink-0"
          >
            <option value="months">mo</option>
            <option value="years">yr</option>
          </select>
        </FieldRow>

        <FieldRow fieldKey="start_date" label="Start Date" extractedFields={extractedFields} provenance={provenance}>
          <input
            required
            type="date"
            className={inputClass}
            {...field('start_date')}
          />
        </FieldRow>

        <FieldRow fieldKey="installment_amount" label="Monthly Payment" extractedFields={extractedFields} provenance={provenance}>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            placeholder="0.00"
            {...field('installment_amount')}
          />
        </FieldRow>
      </div>

      {/* Section 2: Loan Context */}
      <div className="border-t border-gray-100 pt-5 mb-6">
        <p className="text-base font-semibold text-gray-900 mb-4">Loan Context</p>
        <FieldRow fieldKey="lender" label="Lender (optional)" extractedFields={extractedFields} provenance={provenance}>
          <input
            className={inputClass}
            placeholder="e.g. Chase, BDO, DBS"
            {...field('lender')}
          />
        </FieldRow>
      </div>

      {/* Loan Structure Inference Banner */}
      {inference.confidence >= 0.60 && (
        <div className={`border rounded-xl p-4 mb-6 ${
          inference.confidence >= 0.80
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  inference.confidence >= 0.80
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {Math.round(inference.confidence * 100)}% confident
                </span>
                <span className="text-sm font-semibold text-gray-900">{inference.interest_type}</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{inference.reason}</p>
              {inference.confidence < 0.80 && (
                <p className="text-xs text-amber-700 mt-1">Please confirm the loan type below.</p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0 mt-0.5">
              {inference.confidence >= 0.80 && (
                <button
                  type="button"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  onClick={() => {
                    setValues(v => ({ ...v, interest_type: inference.interest_type }));
                    setAdvancedOpen(false);
                  }}
                >
                  Looks right ✓
                </button>
              )}
              <button
                type="button"
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => {
                  setAdvancedOpen(true);
                  setUserOverrodeInterestType(true);
                }}
              >
                Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Advanced Settings (collapsible) */}
      <div className="border-t border-gray-100 pt-5 mb-6">
        <button
          type="button"
          onClick={() => setAdvancedOpen(o => !o)}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <span>Advanced Settings</span>
          <span className="text-gray-400">{advancedOpen ? '▲' : '▼'}</span>
        </button>

        {advancedOpen && (
          <div className="rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ background: '#F9FAFB' }}>
            <FieldRow fieldKey="interest_type" label="Loan Type" extractedFields={extractedFields} provenance={provenance}>
              <select
                className={inputClass}
                value={values.interest_type}
                onChange={e => {
                  setHasEdited(true);
                  setUserOverrodeInterestType(true);
                  setValues(v => ({ ...v, interest_type: e.target.value }));
                }}
              >
                {INTEREST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FieldRow>

            <FieldRow fieldKey="interest_basis" label="Interest Basis" extractedFields={extractedFields} provenance={provenance}>
              <select className={inputClass} {...field('interest_basis')}>
                {INTEREST_BASES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </FieldRow>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mb-4">{error}</p>}

      {/* Sticky Footer */}
      <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-white/90 backdrop-blur-sm border-t border-gray-100 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/dashboard/loans')}
          className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Confirm & Save Loan →'}
        </button>
      </div>
    </form>
  );
}
