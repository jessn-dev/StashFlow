import { describe, it, expect, vi } from 'vitest';
import { AssetQuery, GoalQuery, BudgetQuery, NetWorthSnapshotQuery, ProfileQuery, LoanQuery, TransactionQuery } from '../index';

describe('API Error Handling', () => {
  const makeMockSupabase = () => {
    const from = vi.fn().mockImplementation((table) => {
      const chain = {} as any;
      ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'maybeSingle', 'limit', 'upsert', 'gte', 'lte', 'or'].forEach(m => {
        chain[m] = vi.fn().mockReturnValue(chain);
      });
      chain.then = (onFullfilled: any) => {
        return Promise.resolve({ data: null, error: { message: 'DB Error' } }).then(onFullfilled);
      };
      return chain;
    });
    return { from };
  };

  it('should handle errors in all queries', async () => {
    const { from } = makeMockSupabase();
    const client = { from } as any;

    await expect(new AssetQuery(client).getAll('u')).rejects.toThrow();
    await expect(new GoalQuery(client).getAll('u')).rejects.toThrow();
    await expect(new BudgetQuery(client).getActive('u')).rejects.toThrow();
    await expect(new NetWorthSnapshotQuery(client).getAll('u')).rejects.toThrow();
    await expect(new ProfileQuery(client).get('u')).rejects.toThrow();
    await expect(new LoanQuery(client).getAll('u')).rejects.toThrow();
    await expect(new TransactionQuery(client).getIncomes('u')).rejects.toThrow();
  });
  
  it('should handle missing data branches', async () => {
    const from = vi.fn().mockImplementation((table) => {
      const chain = {} as any;
      ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'maybeSingle', 'limit', 'upsert', 'gte', 'lte', 'or'].forEach(m => {
        chain[m] = vi.fn().mockReturnValue(chain);
      });
      chain.then = (onFullfilled: any) => {
        return Promise.resolve({ data: null, error: null }).then(onFullfilled);
      };
      return chain;
    });
    const client = { from } as any;
    
    expect(await new AssetQuery(client).getAll('u')).toEqual([]);
    expect(await new GoalQuery(client).getAll('u')).toEqual([]);
    expect(await new BudgetQuery(client).getActive('u')).toEqual([]);
  });
});
