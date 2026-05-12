import { describe, it, expect, vi } from 'vitest';
import { LoanQuery } from './loan';

describe('LoanQuery', () => {
  interface MockFrom {
    (table: string): any;
    _data?: any;
    _error?: any;
  }

  const makeMockSupabase = () => {
    const from: MockFrom = vi.fn().mockImplementation((table) => {
      const chain = {} as any;
      ['select', 'eq', 'order', 'maybeSingle'].forEach(m => {
        chain[m] = vi.fn().mockReturnValue(chain);
      });
      chain.then = (onFullfilled: any) => {
        return Promise.resolve({ data: from._data, error: from._error }).then(onFullfilled);
      };
      return chain;
    }) as MockFrom;
    return { from };
  };

  it('should get all loans', async () => {
    const { from } = makeMockSupabase();
    from._data = [{ id: '1', principal: 1000 }];
    const query = new LoanQuery({ from } as any);
    const result = await query.getAll('user-1');
    expect(result).toHaveLength(1);
  });

  it('should return empty array if getAll has no data', async () => {
    const { from } = makeMockSupabase();
    from._data = null;
    const query = new LoanQuery({ from } as any);
    const result = await query.getAll('user-1');
    expect(result).toEqual([]);
  });

  it('should get loan by id and return data', async () => {
    const { from } = makeMockSupabase();
    from._data = { id: '1', principal: 1000 };
    const query = new LoanQuery({ from } as any);
    const result = await query.getById('1', 'user-1');
    expect(result?.principal).toBe(1000);
  });

  it('should throw error on getById if db fails', async () => {
    const { from } = makeMockSupabase();
    from._error = { message: 'Get failed' };
    const query = new LoanQuery({ from } as any);
    await expect(query.getById('1', 'u')).rejects.toThrow('Get failed');
  });

  it('should get payments', async () => {
    const { from } = makeMockSupabase();
    from._data = [{ id: 'p1', amount: 100 }];
    const query = new LoanQuery({ from } as any);
    const result = await query.getPayments('1');
    expect(result).toHaveLength(1);
  });

  it('should return empty array if getPayments has no data', async () => {
    const { from } = makeMockSupabase();
    from._data = null;
    const query = new LoanQuery({ from } as any);
    const result = await query.getPayments('1');
    expect(result).toEqual([]);
  });

  it('should get payment summaries', async () => {
    const { from } = makeMockSupabase();
    from._data = [
      { loan_id: '1', status: 'paid', due_date: '2026-01-01' },
      { loan_id: '1', status: 'pending', due_date: '2026-02-01' },
      { loan_id: '2', status: 'pending', due_date: '2026-03-01' },
      { loan_id: '2', status: 'pending', due_date: '2026-01-01' }, 
    ];
    const query = new LoanQuery({ from } as any);
    const result = await query.getPaymentSummaries('user-1');
    expect(result).toHaveLength(2);
    
    const l1 = result.find(r => r.loanId === '1');
    expect(l1?.paidCount).toBe(1);
    expect(l1?.nextDueDate).toBe('2026-02-01');

    const l2 = result.find(r => r.loanId === '2');
    expect(l2?.nextDueDate).toBe('2026-01-01');
  });

  it('should throw error on getPaymentSummaries if db fails', async () => {
    const { from } = makeMockSupabase();
    from._error = { message: 'Summary failed' };
    const query = new LoanQuery({ from } as any);
    await expect(query.getPaymentSummaries('u')).rejects.toThrow('Summary failed');
  });
});
