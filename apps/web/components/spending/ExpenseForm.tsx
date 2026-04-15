'use client'

import { useState } from 'react'
import { addExpense } from '@/app/dashboard/spending/actions'
import { Database } from '@fintrack/core'

type ExpenseCategory = Database['public']['Enums']['expense_category']

const CATEGORIES: ExpenseCategory[] = [
  'housing', 'food', 'transport', 'utilities', 'healthcare', 
  'entertainment', 'education', 'personal', 'other'
]

export default function ExpenseForm() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setMessage(null)
    
    const result = await addExpense(formData)
    
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Expense added successfully!' })
      // Optional: Reset form if needed, but standard HTML form reset works if we don't control values
      const form = document.getElementById('expense-form') as HTMLFormElement
      form?.reset()
    }
    setLoading(false)
  }

  return (
    <div className="bg-white p-8 border border-brand-primary/10 shadow-sm">
      <h2 className="font-serif text-2xl font-bold text-brand-primary mb-6">Log New Expense</h2>
      
      <form id="expense-form" action={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-bold text-brand-primary uppercase tracking-widest text-xs">Amount</span>
            </label>
            <input 
              type="number" 
              name="amount" 
              step="0.01" 
              placeholder="0.00" 
              className="input input-bordered w-full rounded-none border-brand-primary/20 focus:border-brand-accent focus:outline-none" 
              required 
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-bold text-brand-primary uppercase tracking-widest text-xs">Currency</span>
            </label>
            <select 
              name="currency" 
              className="select select-bordered w-full rounded-none border-brand-primary/20 focus:border-brand-accent focus:outline-none"
              defaultValue="USD"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-bold text-brand-primary uppercase tracking-widest text-xs">Category</span>
          </label>
          <select 
            name="category" 
            className="select select-bordered w-full rounded-none border-brand-primary/20 focus:border-brand-accent focus:outline-none"
            required
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat} className="capitalize">{cat}</option>
            ))}
          </select>
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-bold text-brand-primary uppercase tracking-widest text-xs">Description</span>
          </label>
          <input 
            type="text" 
            name="description" 
            placeholder="e.g. Weekly Groceries" 
            className="input input-bordered w-full rounded-none border-brand-primary/20 focus:border-brand-accent focus:outline-none" 
            required 
          />
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-bold text-brand-primary uppercase tracking-widest text-xs">Date</span>
          </label>
          <input 
            type="date" 
            name="date" 
            className="input input-bordered w-full rounded-none border-brand-primary/20 focus:border-brand-accent focus:outline-none" 
            defaultValue={new Date().toISOString().split('T')[0]}
            required 
          />
        </div>

        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-4">
            <input type="checkbox" name="is_recurring" className="checkbox checkbox-primary rounded-none" />
            <span className="label-text font-bold text-brand-primary uppercase tracking-widest text-xs">Recurring Expense</span>
          </label>
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-bold text-brand-primary uppercase tracking-widest text-xs">Notes (Optional)</span>
          </label>
          <textarea 
            name="notes" 
            className="textarea textarea-bordered h-24 rounded-none border-brand-primary/20 focus:border-brand-accent focus:outline-none" 
            placeholder="Add any extra details..."
          ></textarea>
        </div>

        {message && (
          <div className={`p-4 text-sm font-mono ${message.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
            {message.text}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="btn btn-primary w-full rounded-none font-bold tracking-widest uppercase"
        >
          {loading ? <span className="loading loading-spinner"></span> : 'Add Expense'}
        </button>
      </form>
    </div>
  )
}
