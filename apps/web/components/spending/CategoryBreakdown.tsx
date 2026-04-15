import { formatCurrency } from '@fintrack/core'

interface CategoryData {
  category: string
  amount: number
}

interface CategoryBreakdownProps {
  data: CategoryData[]
}

export default function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  const total = data.reduce((sum, item) => sum + item.amount, 0)
  const sortedData = [...data].sort((a, b) => b.amount - a.amount)

  if (total === 0) {
    return (
      <div className="bg-white p-8 border border-brand-primary/10 shadow-sm">
        <h2 className="font-serif text-2xl font-bold text-brand-primary mb-6">Spending Breakdown</h2>
        <p className="text-brand-text/60 font-mono text-sm">No data to display.</p>
      </div>
    )
  }

  return (
    <div className="bg-white p-8 border border-brand-primary/10 shadow-sm">
      <h2 className="font-serif text-2xl font-bold text-brand-primary mb-6">Spending Breakdown</h2>
      
      <div className="space-y-6">
        {sortedData.map((item) => {
          const percentage = (item.amount / total) * 100
          return (
            <div key={item.category}>
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-brand-primary uppercase tracking-widest capitalize">
                  {item.category}
                </span>
                <span className="text-sm font-mono text-brand-text/70">
                  {formatCurrency(item.amount)} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-brand-bg h-2 overflow-hidden">
                <div 
                  className="bg-brand-accent h-full transition-all duration-500" 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-10 pt-6 border-t border-brand-primary/10 flex justify-between items-center">
        <span className="text-sm font-bold text-brand-primary uppercase tracking-widest">Total Spending</span>
        <span className="text-2xl font-serif font-bold text-brand-primary">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}
