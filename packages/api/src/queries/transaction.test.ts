import { describe, it, expect, vi } from 'vitest'
import { TransactionQuery } from './transaction'

describe('TransactionQuery', () => {
  interface MockFrom {
    (table: string): any;
    _data?: any;
    _error?: any;
    _data_map?: Record<string, any>;
    _call_counts: Record<string, number>;
  }

  const makeMockSupabase = () => {
    const from: MockFrom = vi.fn().mockImplementation((table) => {
      const chain = {} as any;
      ['select', 'eq', 'gte', 'lte', 'lt', 'or', 'order', 'limit', 'single', 'maybeSingle'].forEach(m => {
        chain[m] = vi.fn().mockReturnValue(chain);
      });
      chain.then = (onFullfilled: any) => {
        from._call_counts[table] = (from._call_counts[table] || 0) + 1;
        let data = from._data_map?.[table] ?? from._data;
        
        // Handle sequence of results for the same table
        if (Array.isArray(data) && data.length > 0 && (data[0] as any)._is_mock_sequence) {
           const idx = from._call_counts[table] - 1;
           data = data[idx]?.items ?? [];
        }
        
        return Promise.resolve({ data, error: from._error }).then(onFullfilled);
      };
      return chain;
    }) as unknown as MockFrom;
    from._data_map = {};
    from._call_counts = {};
    return { from };
  };

  it('should fetch summary for a period', async () => {
    const { from } = makeMockSupabase();
    from._data_map = {
      profiles: { preferred_currency: 'USD' },
      exchange_rates: [{ target: 'PHP', rate: 50 }],
      incomes: [{ amount: 1000, currency: 'USD' }, { amount: 5000, currency: 'PHP' }],
      expenses: [{ amount: 500, currency: 'USD' }]
    };

    const query = new TransactionQuery({ from } as any)
    const result = await query.getSummaryForPeriod('user-1', '2026-05-01', '2026-05-31')
    
    expect(result.totalIncome).toBe(1100) // 1000 + 5000/50
    expect(result.totalExpenses).toBe(500)
    expect(result.count).toBe(3)
  })

  it('should fetch filtered transactions with all options', async () => {
    const { from } = makeMockSupabase();
    from._data = [{ id: '1', amount: 100, type: 'expense', date: '2026-05-01' }];

    const query = new TransactionQuery({ from } as any)
    const result = await query.getTransactionsFiltered('user-1', { 
      type: 'expense',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
      search: 'food',
      cursor: '2026-05-01|1'
    })
    
    expect(result).toHaveLength(1)
  })

  it('should fetch spending by category', async () => {
    const { from } = makeMockSupabase();
    from._data_map = {
      exchange_rates: [{ target: 'USD', rate: 1 }],
      expenses: [{ amount: 100, currency: 'USD', category: 'food' }, { amount: 200, currency: 'USD', category: null }]
    };

    const query = new TransactionQuery({ from } as any)
    const result = await query.getSpendingByCategory('user-1', '2026-05-01', '2026-05-31')
    
    expect(result).toHaveLength(2)
    expect(result.find(r => r.category === 'food')?.amount).toBe(100)
    expect(result.find(r => r.category === 'other')?.amount).toBe(200)
  })

  it('should fetch historical summaries with data', async () => {
    const { from } = makeMockSupabase();
    const today = new Date().toISOString().slice(0, 7);
    from._data_map = {
      incomes: [{ amount: 1000, currency: 'USD', date: `${today}-01` }],
      expenses: [{ amount: 500, currency: 'USD', date: `${today}-01` }],
      exchange_rates: [],
      profiles: { preferred_currency: 'USD' }
    };

    const query = new TransactionQuery({ from } as any)
    const result = await query.getHistoricalSummaries('user-1', 3)
    const currentMonth = result.find(r => r.month === today);
    expect(currentMonth?.totalIncome).toBe(1000);
    expect(currentMonth?.totalExpenses).toBe(500);
  })

  it('should get all transactions combined', async () => {
    const { from } = makeMockSupabase();
    from._data_map = {
      incomes: [{ id: 'i1', amount: 1000, date: '2026-05-01' }],
      expenses: [{ id: 'e1', amount: 500, date: '2026-05-02' }]
    };

    const query = new TransactionQuery({ from } as any);
    const result = await query.getAllTransactions('user-1');
    expect(result).toHaveLength(2);
    expect(result[0]?.type).toBe('expense'); // Sorted by date desc
  });

  it('should get transaction summary for a month', async () => {
    const { from } = makeMockSupabase();
    from._data_map = {
      profiles: { preferred_currency: 'USD' },
      exchange_rates: [{ target: 'PHP', rate: 50 }],
      incomes: [
        { id: 'i1', amount: 1000, currency: 'USD', date: '2026-05-01' },
        { id: 'i2', amount: 5000, currency: 'PHP', date: '2026-05-01' }
      ],
      expenses: [
        { id: 'e1', amount: 500, currency: 'USD', date: '2026-05-02' }
      ]
    };

    const query = new TransactionQuery({ from } as any);
    const result = await query.getTransactionSummary('user-1', '2026-05');
    expect(result.totalIncome).toBe(1100);
    expect(result.totalExpenses).toBe(500);
    expect(result.netFlow).toBe(600);
    expect(result.currency).toBe('USD');
  });

  it('should throw error if getTransactionsFiltered fails', async () => {
    const { from } = makeMockSupabase();
    from._error = { message: 'Filter failed' };
    const query = new TransactionQuery({ from } as any);
    await expect(query.getTransactionsFiltered('u', {})).rejects.toThrow('Filter failed');
  });

  it('should throw error if db fails', async () => {
    const { from } = makeMockSupabase();
    from._error = { message: 'DB Error' };
    const query = new TransactionQuery({ from } as any);
    await expect(query.getIncomes('user-1')).rejects.toThrow('DB Error');
  });

  it('should fetch incomes', async () => {
    const { from } = makeMockSupabase();
    from._data = [{ id: '1', amount: 1000 }];
    const query = new TransactionQuery({ from } as any);
    const result = await query.getIncomes('user-1');
    expect(result).toHaveLength(1);
  });

  it('should fetch expenses', async () => {
    const { from } = makeMockSupabase();
    from._data = [{ id: '1', amount: 500 }];
    const query = new TransactionQuery({ from } as any);
    const result = await query.getExpenses('user-1');
    expect(result).toHaveLength(1);
  });

  it('should analyze spending trends', async () => {
    const { from } = makeMockSupabase();
    from._data_map = {
      exchange_rates: [],
      expenses: [
        { _is_mock_sequence: true, items: [{ amount: 200, currency: 'USD', category: 'food', date: '2026-05-10' }] }, // first call (current)
        { _is_mock_sequence: true, items: [{ amount: 100, currency: 'USD', category: 'food', date: '2026-04-10' }] }  // second call (previous)
      ]
    };
    const query = new TransactionQuery({ from } as any);
    const result = await query.getTrendAnalysis('user-1');
    expect(result).toHaveLength(1);
    expect(result[0]?.changePercent).toBe(100);
  });
})
