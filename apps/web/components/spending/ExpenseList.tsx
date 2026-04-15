'use client'

import { removeExpense } from '@/app/dashboard/spending/actions'
import { formatCurrency, Database } from '@fintrack/core'
import { useState } from 'react'

type Expense = Database['public']['Tables']['expenses']['Row']

interface ExpenseListProps {
  expenses: Expense[]
}

export default function ExpenseList({ expenses }: ExpenseListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this expense?')) return
    
    setDeletingId(id)
    await removeExpense(id)
    setDeletingId(null)
  }

  if (expenses.length === 0) {
    return (
      <div className="bg-white p-16 border border-brand-primary/10 shadow-sm text-center">
        <p className="text-brand-text/60 font-mono text-sm">No expenses recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-brand-primary/10 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-brand-primary/10">
        <h2 className="font-serif text-2xl font-bold text-brand-primary">Expense History</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr className="text-xs font-mono tracking-widest text-brand-text/50 uppercase border-b border-brand-primary/5">
              <th className="bg-white py-6 px-8">Date</th>
              <th className="bg-white py-6 px-8">Description / Category</th>
              <th className="bg-white py-6 px-8 text-right">Amount</th>
              <th className="bg-white py-6 px-8"></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-brand-bg/30 transition-colors border-b border-brand-primary/5 last:border-0">
                <td className="py-5 px-8 text-sm font-mono text-brand-text/70">
                  {new Date(expense.date).toLocaleDateString()}
                </td>
                <td className="py-5 px-8">
                  <div className="font-bold text-brand-primary">
                    {expense.description}
                  </div>
                  <div className="text-xs text-brand-text/50 capitalize">
                    {expense.category} {expense.is_recurring && '• Recurring'}
                  </div>
                </td>
                <td className="py-5 px-8 text-right font-serif font-bold text-brand-text">
                  -{formatCurrency(expense.amount, expense.currency)}
                </td>
                <td className="py-5 px-8 text-right">
                  <button 
                    onClick={() => handleDelete(expense.id)}
                    disabled={deletingId === expense.id}
                    className="text-error hover:text-error/80 transition-colors"
                  >
                    {deletingId === expense.id ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
