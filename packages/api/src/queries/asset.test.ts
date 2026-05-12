import { describe, it, expect, vi } from 'vitest';
import { AssetQuery } from './asset';

describe('AssetQuery', () => {
  interface MockFrom {
    (table: string): any;
    _data?: any;
    _error?: any;
    _data_map?: Record<string, any>;
  }

  const makeMockSupabase = () => {
    const from: MockFrom = vi.fn().mockImplementation((table) => {
      const chain = {} as any;
      ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'maybeSingle', 'limit'].forEach(m => {
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

  it('should get all assets for a user', async () => {
    const { from } = makeMockSupabase();
    from._data = [{ id: '1', name: 'Cash' }];
    const query = new AssetQuery({ from } as any);
    const result = await query.getAll('user-1');
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Cash');
  });

  it('should throw error on getAll if db fails', async () => {
    const { from } = makeMockSupabase();
    from._error = { message: 'DB Error' };
    const query = new AssetQuery({ from } as any);
    await expect(query.getAll('user-1')).rejects.toThrow('DB Error');
  });

  it('should create an asset', async () => {
    const { from } = makeMockSupabase();
    from._data = { id: '2', name: 'Stock' };
    const query = new AssetQuery({ from } as any);
    const result = await query.create('user-1', { name: 'Stock', type: 'investment', balance: 1000, currency: 'USD' });
    expect(result.name).toBe('Stock');
  });

  it('should throw error on create if db fails', async () => {
    const { from } = makeMockSupabase();
    from._error = { message: 'Create failed' };
    const query = new AssetQuery({ from } as any);
    await expect(query.create('user-1', {} as any)).rejects.toThrow('Create failed');
  });

  it('should update an asset', async () => {
    const { from } = makeMockSupabase();
    from._data = { id: '1', balance: 2000 };
    const query = new AssetQuery({ from } as any);
    const result = await query.update('1', 'user-1', { balance: 2000 });
    expect(result.balance).toBe(2000);
  });

  it('should throw error on update if db fails', async () => {
    const { from } = makeMockSupabase();
    from._error = { message: 'Update failed' };
    const query = new AssetQuery({ from } as any);
    await expect(query.update('1', 'user-1', {})).rejects.toThrow('Update failed');
  });

  it('should delete an asset', async () => {
    const { from } = makeMockSupabase();
    const query = new AssetQuery({ from } as any);
    await expect(query.delete('1', 'user-1')).resolves.not.toThrow();
  });

  it('should throw error on delete if db fails', async () => {
    const { from } = makeMockSupabase();
    from._error = { message: 'Delete failed' };
    const query = new AssetQuery({ from } as any);
    await expect(query.delete('1', 'user-1')).rejects.toThrow('Delete failed');
  });
});
