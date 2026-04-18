import { SupabaseClient } from '@supabase/supabase-js'
import { Database, Document } from '@stashflow/core'

/**
 * Fetch all document metadata for the user
 */
export async function getDocuments(supabase: SupabaseClient<Database>): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

/**
 * Delete a document from both database and storage
 */
export async function deleteDocument(supabase: SupabaseClient<Database>, doc: Document) {
  // 1. Delete from Storage
  const { error: storageError } = await supabase.storage
    .from('user_documents')
    .remove([doc.storage_path])
  
  if (storageError) throw storageError

  // 2. Delete from Database
  const { error: dbError } = await supabase
    .from('documents')
    .delete()
    .eq('id', doc.id)

  if (dbError) throw dbError
}

/**
 * Generate a short-lived signed URL for viewing a private document
 */
export async function getDocumentUrl(supabase: SupabaseClient<Database>, path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('user_documents')
    .createSignedUrl(path, 60) // 60 seconds expiry

  if (error) throw error
  return data.signedUrl
}
