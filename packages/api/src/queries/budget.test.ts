import { describe, it, expect, vi } from 'vitest';
import { BudgetQuery } from './budget';

describe('BudgetQuery', () => {
  const makeMockSupabase = () => {
    const from = vi.fn().mockImplementation((table) => {
      const chain = {} as any;
      ['select', 'eq', 'upsert', 'single', 'delete'].forEach(m => {
        chain[m] = vi.fn().mockReturnValue(chain);
      });
      chain.then = (onFullfilled: any) => {
        const data = from._data_map?.[table] ?? from._data;
        return Promise.resolve({ data, error: from._error }).then(onFullfilled);
      };
      return chain;
    });
    (from as any)._data_map = {};
    return { from };
  };

  it('should get active budgets', async () => {
    const { from } = makeMockSupabase();
    (from as any)._data = [{ category: 'food', amount: 500 }];
    const query = new BudgetQuery({ from } as any);
    const result = await query.getActive('user-1');
    expect(result).toHaveLength(1);
  });

  it('should throw error on getActive if db fails', async () => {
    const { from } = makeMockSupabase();
    (from as any)._error = { message: 'DB Error' };
    const query = new BudgetQuery({ from } as any);
    await expect(query.getActive('user-1')).rejects.toThrow('DB Error');
  });

  it('should upsert a budget', async () => {
    const { from } = makeMockSupabase();
    (from as any)._data = { category: 'food', amount: 500 };
    const query = new BudgetQuery({ from } as any);
    const result = await query.upsert('user-1', 'food', 500, 'USD');
    expect(result.category).toBe('food');
  });

  it('should get periods', async () => {
    const { from } = makeMockSupabase();
    (from as any)._data = [{ period: '2026-05', budgeted: 500 }];
    const query = new BudgetQuery({ from } as any);
    const result = await query.getPeriods('user-1', '2026-05');
    expect(result).toHaveLength(1);
  });

  it('should delete a budget', async () => {
    const { from } = makeMockSupabase();
    const query = new BudgetQuery({ from } as any);
    await expect(query.delete('1')).resolves.not.toThrow();
  });
});
