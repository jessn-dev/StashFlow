import { describe, it, expect, vi } from 'vitest';
import { LoanQuery } from './loan';

describe('LoanQuery', () => {
  const makeMockSupabase = () => {
    const from = vi.fn().mockImplementation((table) => {
      const chain = {} as any;
      ['select', 'eq', 'maybeSingle', 'order'].forEach(m => {
        chain[m] = vi.fn().mockReturnValue(chain);
      });
      chain.then = (onFullfilled: any) => {
        return Promise.resolve({ data: from._data, error: from._error }).then(onFullfilled);
      };
      return chain;
    });
    return { from };
  };

  it('should get all loans', async () => {
    const { from } = makeMockSupabase();
    (from as any)._data = [{ id: '1', principal: 1000 }];
    const query = new LoanQuery({ from } as any);
    const result = await query.getAll('user-1');
    expect(result).toHaveLength(1);
  });

  it('should throw error on getAll if db fails', async () => {
    const { from } = makeMockSupabase();
    (from as any)._error = { message: 'DB Error' };
    const query = new LoanQuery({ from } as any);
    await expect(query.getAll('user-1')).rejects.toThrow('DB Error');
  });

  it('should get loan by id', async () => {
    const { from } = makeMockSupabase();
    (from as any)._data = { id: '1', principal: 1000 };
    const query = new LoanQuery({ from } as any);
    const result = await query.getById('1', 'user-1');
    expect(result?.principal).toBe(1000);
  });

  it('should get payments', async () => {
    const { from } = makeMockSupabase();
    (from as any)._data = [{ id: 'p1', amount: 100 }];
    const query = new LoanQuery({ from } as any);
    const result = await query.getPayments('1');
    expect(result).toHaveLength(1);
  });

  it('should get payment summaries', async () => {
    const { from } = makeMockSupabase();
    (from as any)._data = [
      { loan_id: '1', status: 'paid', due_date: '2026-01-01' },
      { loan_id: '1', status: 'pending', due_date: '2026-02-01' },
    ];
    const query = new LoanQuery({ from } as any);
    const result = await query.getPaymentSummaries('user-1');
    expect(result).toHaveLength(1);
    expect(result[0]?.paidCount).toBe(1);
    expect(result[0]?.nextDueDate).toBe('2026-02-01');
  });
});
