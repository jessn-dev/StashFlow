import { describe, it, expect, vi } from 'vitest';
import { NetWorthSnapshotQuery } from './net-worth-snapshot';

describe('NetWorthSnapshotQuery', () => {
  interface MockFrom {
    (table: string): any;
    _data?: any;
    _error?: any;
    _data_map?: Record<string, any>;
  }

  const makeMockSupabase = () => {
    const from: MockFrom = vi.fn().mockImplementation((table) => {
      const chain = {} as any;
      ['select', 'eq', 'order', 'limit', 'single', 'insert'].forEach(m => {
        chain[m] = vi.fn().mockReturnValue(chain);
      });
      chain.then = (onFullfilled: any) => {
        const data = from._data_map?.[table] ?? from._data;
        return Promise.resolve({ data, error: from._error }).then(onFullfilled);
      };
      return chain;
    }) as MockFrom;
    from._data_map = {};
    return { from };
  };

  it('should get all snapshots', async () => {
    const { from } = makeMockSupabase();
    from._data = [{ id: '1', net_worth: 10000 }];
    const query = new NetWorthSnapshotQuery({ from } as any);
    const result = await query.getAll('user-1');
    expect(result).toHaveLength(1);
  });

  it('should return empty array if getAll has no data', async () => {
    const { from } = makeMockSupabase();
    from._data = null;
    const query = new NetWorthSnapshotQuery({ from } as any);
    const result = await query.getAll('user-1');
    expect(result).toEqual([]);
  });

  it('should get the latest snapshot', async () => {
    const { from } = makeMockSupabase();
    from._data = { id: '1', net_worth: 10000 };
    const query = new NetWorthSnapshotQuery({ from } as any);
    const result = await query.getLatest('user-1');
    expect(result?.net_worth).toBe(10000);
  });

  it('should return null on getLatest if no records (PGRST116)', async () => {
    const { from } = makeMockSupabase();
    from._error = { code: 'PGRST116', message: 'No rows' };
    const query = new NetWorthSnapshotQuery({ from } as any);
    const result = await query.getLatest('user-1');
    expect(result).toBeNull();
  });

  it('should throw on getLatest if other db error', async () => {
    const { from } = makeMockSupabase();
    from._error = { code: 'PGRST999', message: 'Other error' };
    const query = new NetWorthSnapshotQuery({ from } as any);
    await expect(query.getLatest('user-1')).rejects.toThrow('Other error');
  });

  it('should create a snapshot', async () => {
    const { from } = makeMockSupabase();
    from._data = { id: '2', net_worth: 15000 };
    const query = new NetWorthSnapshotQuery({ from } as any);
    const result = await query.create('user-1', { 
      net_worth: 15000, 
      total_assets: 20000, 
      total_liabilities: 5000, 
      snapshot_date: '2026-06-01',
      currency: 'USD'
    });
    expect(result.net_worth).toBe(15000);
  });

  it('should throw error on create if db fails', async () => {
    const { from } = makeMockSupabase();
    from._error = { message: 'Create failed' };
    const query = new NetWorthSnapshotQuery({ from } as any);
    await expect(query.create('user-1', {} as any)).rejects.toThrow('Create failed');
  });
});
