import { formatCurrency } from '@stashflow/core';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  category?: string;
}

export function TransactionList({ 
  transactions, 
  title 
}: { 
  transactions: Transaction[];
  title: string;
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="divide-y">
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No transactions found.</div>
        ) : (
          transactions.map((t) => (
            <div key={t.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
              <div>
                <p className="font-medium">{t.description}</p>
                <p className="text-xs text-gray-500">{t.date} {t.category ? `• ${t.category}` : ''}</p>
              </div>
              <p className="font-bold">
                {formatCurrency(t.amount, t.currency)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
