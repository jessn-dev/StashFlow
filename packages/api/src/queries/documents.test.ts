import { describe, it, expect, vi } from 'vitest'
import { getDocuments, deleteDocument, getDocumentUrl } from './documents'
import { SupabaseClient } from '@supabase/supabase-js'

const mockDoc = {
  id: 'd1', user_id: 'u1', file_name: 'statement.pdf',
  file_size: 1024, content_type: 'application/pdf',
  storage_path: 'u1/statement.pdf', created_at: null,
}

describe('getDocuments', () => {
  it('returns all documents ordered by created_at', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [mockDoc], error: null }),
        }),
      }),
    } as unknown as SupabaseClient

    const result = await getDocuments(supabase)
    expect(result).toHaveLength(1)
    expect(result[0].file_name).toBe('statement.pdf')
  })

  it('throws when query errors', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('db error') }),
        }),
      }),
    } as unknown as SupabaseClient

    await expect(getDocuments(supabase)).rejects.toThrow('db error')
  })
})

describe('deleteDocument — db error', () => {
  it('throws when db deletion errors after storage succeeds', async () => {
    const supabase = {
      storage: {
        from: vi.fn().mockReturnValue({
          remove: vi.fn().mockResolvedValue({ error: null }),
        }),
      },
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error('db delete error') }),
        }),
      }),
    } as unknown as SupabaseClient

    await expect(deleteDocument(supabase, mockDoc)).rejects.toThrow('db delete error')
  })
})

describe('deleteDocument', () => {
  it('removes from storage then deletes db record', async () => {
    const supabase = {
      storage: {
        from: vi.fn().mockReturnValue({
          remove: vi.fn().mockResolvedValue({ error: null }),
        }),
      },
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    } as unknown as SupabaseClient

    await expect(deleteDocument(supabase, mockDoc)).resolves.toBeUndefined()
    expect(supabase.storage.from).toHaveBeenCalledWith('user_documents')
  })

  it('throws when storage deletion errors', async () => {
    const supabase = {
      storage: {
        from: vi.fn().mockReturnValue({
          remove: vi.fn().mockResolvedValue({ error: new Error('storage error') }),
        }),
      },
    } as unknown as SupabaseClient

    await expect(deleteDocument(supabase, mockDoc)).rejects.toThrow('storage error')
  })
})

describe('getDocumentUrl', () => {
  it('returns a signed URL', async () => {
    const supabase = {
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: 'https://example.com/signed' },
            error: null,
          }),
        }),
      },
    } as unknown as SupabaseClient

    const url = await getDocumentUrl(supabase, 'u1/statement.pdf')
    expect(url).toBe('https://example.com/signed')
  })

  it('throws when createSignedUrl errors', async () => {
    const supabase = {
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('url error'),
          }),
        }),
      },
    } as unknown as SupabaseClient

    await expect(getDocumentUrl(supabase, 'u1/statement.pdf')).rejects.toThrow('url error')
  })
})
