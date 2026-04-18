'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { YStack, XStack, Text, Button, Spinner, Circle, View } from 'tamagui'
import { X, FileText, Download, Trash2, Upload, Calendar, Sparkles, CheckCircle, AlertCircle } from 'lucide-react-native'
import { createClient } from '@/utils/supabase/client'
import { getDocuments, deleteDocument, getDocumentUrl } from '@stashflow/api'
import { Document as SFDocument } from '@stashflow/core'
import ConfirmationModal from '@/components/ui/ConfirmationModal'

interface DocumentsModalProps {
  onClose: () => void
}

type ImportState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; total: number; incomes: number; expenses: number }
  | { status: 'done-loan'; loanName: string }
  | { status: 'error'; message: string }

export default function DocumentsModal({ onClose }: DocumentsModalProps) {
  const router = useRouter()
  const [docs, setDocs] = useState<SFDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importStates, setImportStates] = useState<Record<string, ImportState>>({})
  const [confirmingDeleteDoc, setConfirmingDeleteDoc] = useState<SFDocument | null>(null)

  const sb = createClient()

  async function fetchDocs() {
    setLoading(true)
    try {
      const data = await getDocuments(sb)
      console.log('Fetched documents:', data)
      setDocs(data || [])
    } catch (e: any) {
      console.error('Fetch docs error:', e)
      setError('Failed to load documents: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDocs() }, [])

  const groupedDocs = useMemo(() => {
    if (!docs || docs.length === 0) return []
    const groups: Record<string, SFDocument[]> = {}
    
    docs.forEach(doc => {
      // Robust date extraction
      const dateStr = doc.created_at || new Date().toISOString()
      const year = new Date(dateStr).getFullYear().toString()
      
      if (!groups[year]) groups[year] = []
      groups[year].push(doc)
    })

    // Convert to sorted array of [year, docs[]]
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [docs])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const ALLOWED = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    if (!ALLOWED.includes(file.type)) { setError('File type not allowed. Use PDF, JPG, PNG, or Excel.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('File exceeds 5MB limit.'); return }

    setUploading(true)
    setError(null)
    try {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const ext = file.name.split('.').pop()
      const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`

      const { error: storageError } = await sb.storage
        .from('user_documents')
        .upload(storagePath, file, { contentType: file.type })
      if (storageError) throw storageError

      const { error: dbError } = await sb.from('documents').insert({
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        content_type: file.type,
        storage_path: storagePath,
      })

      if (dbError) {
        await sb.storage.from('user_documents').remove([storagePath])
        throw dbError
      }

      await fetchDocs()
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleView(doc: SFDocument) {
    try {
      const url = await getDocumentUrl(sb, doc.storage_path)
      window.open(url, '_blank')
    } catch {
      alert('Could not generate secure link')
    }
  }

  async function handleDelete() {
    if (!confirmingDeleteDoc) return
    try {
      await deleteDocument(sb, confirmingDeleteDoc)
      setDocs(prev => prev.filter(d => d.id !== confirmingDeleteDoc.id))
      setConfirmingDeleteDoc(null)
    } catch {
      alert('Delete failed')
    }
  }

  async function handleImport(doc: SFDocument) {
    setImportStates(prev => ({ ...prev, [doc.id]: { status: 'loading' } }))
    try {
      const { data: { session } } = await sb.auth.getSession()
      const profile = await sb.from('profiles').select('preferred_currency').single()

      const res = await fetch('/api/parse-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_path: doc.storage_path,
          content_type: doc.content_type,
          preferred_currency: profile.data?.preferred_currency || 'USD',
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Import failed')

      if (result.type === 'loan_schedule') {
        setImportStates(prev => ({ ...prev, [doc.id]: { status: 'done-loan', loanName: result.loan_name } }))
      } else {
        setImportStates(prev => ({
          ...prev,
          [doc.id]: { status: 'done', total: result.total, incomes: result.incomes, expenses: result.expenses },
        }))
      }
      router.refresh()
    } catch (err: any) {
      setImportStates(prev => ({ ...prev, [doc.id]: { status: 'error', message: err.message } }))
    }
  }

  function formatSize(bytes: number) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget && !uploading) onClose() }}
    >
      <ConfirmationModal
        isOpen={confirmingDeleteDoc !== null}
        onClose={() => setConfirmingDeleteDoc(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        description="Are you sure you want to delete this document? It will be permanently removed from your vault."
        confirmText="Delete"
        isHighRisk={true}
      />
      <div style={{ width: '100%', maxWidth: 860, maxHeight: '90vh', background: '#151f2e', borderRadius: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>Document Vault</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Secure Financial Records</div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
              <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: uploading ? 'rgba(255,255,255,0.08)' : '#1A7A7A', padding: '10px 16px', borderRadius: 8, cursor: uploading ? 'not-allowed' : 'pointer' }}>
                {uploading ? <Spinner size="small" color="white" /> : <Upload size={14} color="white" />}
                <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>{uploading ? 'Uploading...' : 'Upload'}</span>
              </div>
            </label>
            <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} color="rgba(255,255,255,0.5)" />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(220,38,38,0.1)', margin: '16px 20px 0', padding: '12px 14px', borderRadius: 8, flexShrink: 0 }}>
            <AlertCircle size={14} color="#DC2626" />
            <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, flex: 1 }}>{error}</span>
            <button onClick={() => setError(null)} style={{ all: 'unset', cursor: 'pointer', display: 'flex' }}><X size={12} color="#DC2626" /></button>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 28 }}>
          {loading ? (
            <YStack flex={1} alignItems="center" justifyContent="center" padding={64}>
              <Spinner size="large" color="$brandAccent" />
            </YStack>
          ) : docs.length === 0 ? (
            <YStack flex={1} alignItems="center" justifyContent="center" padding={64} gap={16}>
              <Circle size={80} backgroundColor="rgba(255,255,255,0.03)" alignItems="center" justifyContent="center">
                <FileText size={32} color="rgba(255,255,255,0.1)" />
              </Circle>
              <Text color="rgba(255,255,255,0.3)" fontSize={15}>Your document vault is empty.</Text>
              <Text color="rgba(255,255,255,0.2)" fontSize={12} textAlign="center">Upload a bank statement (PDF, image, or Excel) to automatically import transactions.</Text>
            </YStack>
          ) : (
            groupedDocs.map(([year, yearDocs]) => (
              <YStack key={year} gap={12}>
                <XStack alignItems="center" gap={12}>
                  <Text fontSize={13} fontWeight="800" color="$brandAccent" backgroundColor="rgba(26,122,122,0.15)" paddingHorizontal={10} paddingVertical={4} borderRadius={4}>{year}</Text>
                  <View flex={1} height={1} backgroundColor="rgba(255,255,255,0.05)" />
                </XStack>

                <YStack gap={8}>
                  {yearDocs.map(doc => {
                    const importState = importStates[doc.id] ?? { status: 'idle' }
                    return (
                      <YStack key={doc.id} backgroundColor="rgba(255,255,255,0.03)" borderRadius={12} borderWidth={1} borderColor="rgba(255,255,255,0.04)">
                        <XStack padding={16} justifyContent="space-between" alignItems="center">
                          {/* File info */}
                          <XStack gap={14} alignItems="center" flex={1} overflow="hidden">
                            <YStack width={40} height={40} borderRadius={8} backgroundColor={doc.content_type === 'application/pdf' ? 'rgba(220,38,38,0.12)' : 'rgba(255,255,255,0.05)'} alignItems="center" justifyContent="center">
                              <FileText size={18} color={doc.content_type === 'application/pdf' ? '#f87171' : 'rgba(255,255,255,0.5)'} />
                            </YStack>
                            <YStack gap={2} flex={1} overflow="hidden">
                              <Text fontSize={14} fontWeight="600" color="white" numberOfLines={1}>{doc.file_name}</Text>
                              <Text fontSize={11} color="rgba(255,255,255,0.35)">{formatSize(doc.file_size)} · {new Date(doc.created_at!).toLocaleDateString()}</Text>
                            </YStack>
                          </XStack>

                          {/* Actions */}
                          <XStack gap={8} alignItems="center">
                            {(
                              <Button
                                size="$2"
                                borderRadius={6}
                                backgroundColor={importState.status === 'done' ? 'rgba(5,150,105,0.15)' : 'rgba(26,122,122,0.2)'}
                                borderWidth={1}
                                borderColor={importState.status === 'done' ? 'rgba(5,150,105,0.3)' : 'rgba(26,122,122,0.3)'}
                                disabled={importState.status === 'loading' || importState.status === 'done' || importState.status === 'done-loan'}
                                onPress={() => handleImport(doc)}
                                paddingHorizontal={12}
                              >
                                <XStack gap={6} alignItems="center">
                                  {importState.status === 'loading' && <Spinner size="small" color="#4ECDC4" />}
                                  {importState.status === 'idle' && <Sparkles size={13} color="#4ECDC4" />}
                                  {(importState.status === 'done' || importState.status === 'done-loan') && <CheckCircle size={13} color="#059669" />}
                                  {importState.status === 'error' && <AlertCircle size={13} color="#f87171" />}
                                  <Text fontSize={12} fontWeight="700" color={(importState.status === 'done' || importState.status === 'done-loan') ? '#059669' : importState.status === 'error' ? '#f87171' : '#4ECDC4'}>
                                    {importState.status === 'loading' ? 'Reading...' :
                                     importState.status === 'done' ? 'Imported' :
                                     importState.status === 'done-loan' ? 'Loan Created' :
                                     importState.status === 'error' ? 'Retry' :
                                     'Import Transactions'}
                                  </Text>
                                </XStack>
                              </Button>
                            )}
                            <Button size="$2" circular={false} borderRadius={6} backgroundColor="rgba(255,255,255,0.05)" onPress={() => handleView(doc)} icon={<Download size={13} color="rgba(255,255,255,0.6)" />} />
                            <Button size="$2" circular={false} borderRadius={6} backgroundColor="rgba(220,38,38,0.08)" onPress={() => setConfirmingDeleteDoc(doc)} icon={<Trash2 size={13} color="#f87171" />} />
                          </XStack>
                        </XStack>

                        {/* Import result row */}
                        {importState.status === 'done' && (
                          <XStack paddingHorizontal={16} paddingBottom={14} gap={16}>
                            <XStack gap={6} alignItems="center" backgroundColor="rgba(5,150,105,0.08)" paddingHorizontal={10} paddingVertical={5} borderRadius={6}>
                              <CheckCircle size={11} color="#059669" />
                              <Text fontSize={11} color="#059669" fontWeight="700">{importState.incomes} income{importState.incomes !== 1 ? 's' : ''} added</Text>
                            </XStack>
                            <XStack gap={6} alignItems="center" backgroundColor="rgba(220,38,38,0.08)" paddingHorizontal={10} paddingVertical={5} borderRadius={6}>
                              <CheckCircle size={11} color="#f87171" />
                              <Text fontSize={11} color="#f87171" fontWeight="700">{importState.expenses} expense{importState.expenses !== 1 ? 's' : ''} added</Text>
                            </XStack>
                          </XStack>
                        )}
                        {importState.status === 'done-loan' && (
                          <XStack paddingHorizontal={16} paddingBottom={14} gap={16}>
                            <XStack gap={6} alignItems="center" backgroundColor="rgba(5,150,105,0.08)" paddingHorizontal={10} paddingVertical={5} borderRadius={6}>
                              <CheckCircle size={11} color="#059669" />
                              <Text fontSize={11} color="#059669" fontWeight="700">Loan added: {importState.loanName}</Text>
                            </XStack>
                            <XStack gap={6} alignItems="center" backgroundColor="rgba(26,122,122,0.1)" paddingHorizontal={10} paddingVertical={5} borderRadius={6}>
                              <Text fontSize={11} color="#4ECDC4" fontWeight="700">View in Loans →</Text>
                            </XStack>
                          </XStack>
                        )}
                        {importState.status === 'error' && (
                          <XStack paddingHorizontal={16} paddingBottom={14}>
                            <Text fontSize={11} color="#f87171">{importState.message}</Text>
                          </XStack>
                        )}
                      </YStack>
                    )
                  })}
                </YStack>
              </YStack>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, padding: '16px 20px', background: 'rgba(0,0,0,0.2)', flexShrink: 0 }}>
          <Calendar size={11} color="rgba(255,255,255,0.25)" />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>End-to-End Encrypted Storage</span>
        </div>
      </div>
    </div>
  )
}
