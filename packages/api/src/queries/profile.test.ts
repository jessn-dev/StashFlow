import { describe, it, expect, vi } from 'vitest';
import { ProfileQuery } from './profile';

describe('ProfileQuery', () => {
  const makeMockSupabase = () => {
    const from = vi.fn().mockImplementation((table) => {
      const chain = {} as any;
      ['select', 'eq', 'maybeSingle', 'single', 'update'].forEach(m => {
        chain[m] = vi.fn().mockReturnValue(chain);
      });
      chain.then = (onFullfilled: any) => {
        return Promise.resolve({ data: from._data, error: from._error }).then(onFullfilled);
      };
      return chain;
    });
    return { from };
  };

  it('should get profile', async () => {
    const { from } = makeMockSupabase();
    (from as any)._data = { id: 'user-1', full_name: 'John' };
    const query = new ProfileQuery({ from } as any);
    const result = await query.get('user-1');
    expect(result?.full_name).toBe('John');
  });

  it('should throw error on get if db fails', async () => {
    const { from } = makeMockSupabase();
    (from as any)._error = { message: 'DB Error' };
    const query = new ProfileQuery({ from } as any);
    await expect(query.get('user-1')).rejects.toThrow('DB Error');
  });

  it('should update profile', async () => {
    const { from } = makeMockSupabase();
    (from as any)._data = { id: 'user-1', full_name: 'John Updated' };
    const query = new ProfileQuery({ from } as any);
    const result = await query.update('user-1', { full_name: 'John Updated' });
    expect(result.full_name).toBe('John Updated');
  });
});
