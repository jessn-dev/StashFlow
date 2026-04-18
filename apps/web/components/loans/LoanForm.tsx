'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addLoanAction } from '@/app/dashboard/loans/actions'
import { YStack, XStack, Text, Input, Button, Label, Spinner, Switch } from 'tamagui'
import { ChevronDown, ChevronUp } from 'lucide-react-native'

interface LoanFormProps {
  onSuccess?: () => void
}

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'PH', name: 'Philippines' },
  { code: 'SG', name: 'Singapore' },
  { code: 'JP', name: 'Japan' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'EU', name: 'European Union' },
]

const CATEGORIES = [
  'Asset-Backed', 'Personal / Cash', 'Statutory / Government', 'Educational', 'Specialized Retail'
]

const INTEREST_TYPES = [
  'Standard Amortized', 'Interest-Only', 'Add-on Interest', 'Fixed Principal'
]

const INTEREST_BASIS = [
  'Actual/365', 'Actual/360', '30/360'
]

export default function LoanForm({ onSuccess }: LoanFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setMessage(null)

    const result = await addLoanAction(formData)

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Loan and schedule created successfully!' })
      const form = document.getElementById('loan-form') as HTMLFormElement
      form?.reset()
      router.refresh()
      onSuccess?.()
    }
    setLoading(false)
  }

  async function handleScan(file: File) {
    setLoading(true)
    setMessage(null)
    try {
      const { createClient } = await import('@/utils/supabase/client')
      const sb = createClient()
      
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const ext = file.name.split('.').pop()
      const storagePath = `${user.id}/scans/${crypto.randomUUID()}.${ext}`

      // 1. Upload temporary scan
      const { error: uploadError } = await sb.storage
        .from('user_documents')
        .upload(storagePath, file)
      if (uploadError) throw uploadError

      // 2. Get signed URL for the function to read it
      const { data: urlData, error: urlError } = await sb.storage
        .from('user_documents')
        .createSignedUrl(storagePath, 60)
      if (urlError) throw urlError

      // 3. Invoke AI extraction
      const { data, error } = await sb.functions.invoke('extract-loan-data', {
        body: { file_url: urlData.signedUrl }
      })
      if (error) throw error
      
      // 4. Map extracted data to form
      const form = document.getElementById('loan-form') as HTMLFormElement
      if (form && data) {
        (form.elements.namedItem('name') as HTMLInputElement).value = data.name;
        (form.elements.namedItem('principal') as HTMLInputElement).value = String(data.principal);
        (form.elements.namedItem('interest_rate') as HTMLInputElement).value = String(data.interest_rate);
        (form.elements.namedItem('duration_months') as HTMLInputElement).value = String(data.duration_months);
        (form.elements.namedItem('currency') as HTMLSelectElement).value = data.currency;
        setMessage({ type: 'success', text: 'Document scanned! Form pre-filled with loan details.' })
      }

      // Cleanup temp scan
      await sb.storage.from('user_documents').remove([storagePath])

    } catch (e: any) {
      setMessage({ type: 'error', text: 'Scan failed: ' + e.message })
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleScan(file)
    e.target.value = ''
  }

  return (
    <YStack backgroundColor="$brandWhite" padding={32} borderRadius={12} borderWidth={1} borderColor="rgba(13,61,61,0.1)" shadowColor="black" shadowOpacity={0.05} shadowRadius={5}>
      <XStack justifyContent="space-between" alignItems="center" marginBottom={24}>
        <Text fontSize={20} fontWeight="700" color="$brandPrimary">Add New Loan</Text>
        <YStack>
          <input 
            type="file" 
            id="loan-scan-input" 
            style={{ display: 'none' }} 
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
          />
          <Button 
            size="$2" 
            backgroundColor="$brandAccent" 
            onPress={() => document.getElementById('loan-scan-input')?.click()} 
            disabled={loading}
          >
            <Text color="white" fontSize={11} fontWeight="700" textTransform="uppercase">
              {loading ? 'Processing...' : 'Scan Document (AI)'}
            </Text>
          </Button>
        </YStack>
      </XStack>
      
      <form id="loan-form" action={handleSubmit}>
        <YStack gap={16}>
          <YStack gap={4}>
            <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Loan Name</Label>
            <Input
              name="name"
              type="text"
              placeholder="e.g. Home Mortgage, Car Loan"
              borderRadius={8}
              borderColor="rgba(13,61,61,0.15)"
              focusStyle={{ borderColor: '$brandAccent' }}
              required
            />
          </YStack>

          <YStack gap={4}>
            <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Lender / Provider (Optional)</Label>
            <Input
              name="lender"
              type="text"
              placeholder="e.g. BDO, Metrobank, Asialink Finance"
              borderRadius={8}
              borderColor="rgba(13,61,61,0.15)"
              focusStyle={{ borderColor: '$brandAccent' }}
            />
          </YStack>

          <XStack gap={16} flexWrap="wrap">
            <YStack flex={1} minWidth={200} gap={4}>
              <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Principal Amount</Label>
              <Input 
                name="principal" 
                inputMode="decimal"
                placeholder="0.00" 
                borderRadius={8}
                borderColor="rgba(13,61,61,0.15)"
                focusStyle={{ borderColor: '$brandAccent' }}
                required 
              />
            </YStack>

            <YStack flex={1} minWidth={200} gap={4}>
              <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Currency</Label>
              <select 
                name="currency" 
                defaultValue="USD"
                style={{
                  height: 44,
                  padding: '0 16px',
                  borderRadius: 8,
                  border: '1px solid rgba(13,61,61,0.15)',
                  backgroundColor: '#FFFFFF',
                  fontSize: 14,
                  color: '#111827',
                  outline: 'none',
                }}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="PHP">PHP (₱)</option>
                <option value="SGD">SGD ($)</option>
              </select>
            </YStack>
          </XStack>

          <XStack gap={16} flexWrap="wrap">
            <YStack flex={1} minWidth={200} gap={4}>
              <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Annual Rate (%)</Label>
              <Input 
                type="number" 
                step="0.01"
                name="interest_rate" 
                placeholder="e.g. 4.5" 
                borderRadius={8}
                borderColor="rgba(13,61,61,0.15)"
                focusStyle={{ borderColor: '$brandAccent' }}
                required 
              />
            </YStack>

            <YStack flex={1} minWidth={200} gap={4}>
              <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Duration (Months)</Label>
              <Input 
                type="number" 
                name="duration_months" 
                placeholder="e.g. 12, 360" 
                borderRadius={8}
                borderColor="rgba(13,61,61,0.15)"
                focusStyle={{ borderColor: '$brandAccent' }}
                required 
              />
            </YStack>
          </XStack>

          <YStack gap={4}>
            <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase" letterSpacing={1}>Start Date</Label>
            <Input 
              type="date" 
              name="start_date" 
              defaultValue={new Date().toISOString().split('T')[0]}
              borderRadius={8}
              borderColor="rgba(13,61,61,0.15)"
              focusStyle={{ borderColor: '$brandAccent' }}
              textAlign="center"
              paddingLeft={32}
              required 
            />
          </YStack>

          {/* ── Advanced Options Toggle ── */}
          <Button 
            chromeless 
            padding={0} 
            justifyContent="flex-start" 
            onPress={() => setShowAdvanced(!showAdvanced)}
            iconAfter={showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          >
            <Text fontSize={12} fontWeight="700" color="$brandAccent" textTransform="uppercase" letterSpacing={1}>
              {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
            </Text>
          </Button>

          {showAdvanced && (
            <YStack gap={16} padding={20} backgroundColor="rgba(13,61,61,0.03)" borderRadius={10}>
              <XStack gap={16} flexWrap="wrap">
                <YStack flex={1} minWidth={150} gap={4}>
                  <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase">Region</Label>
                  <select 
                    name="country_code" 
                    defaultValue="US"
                    style={{ height: 40, borderRadius: 6, border: '1px solid rgba(13,61,61,0.1)', padding: '0 10px', fontSize: 13 }}
                  >
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </YStack>
                <YStack flex={1} minWidth={150} gap={4}>
                  <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase">Category</Label>
                  <select 
                    name="commercial_category" 
                    defaultValue="Personal / Cash"
                    style={{ height: 40, borderRadius: 6, border: '1px solid rgba(13,61,61,0.1)', padding: '0 10px', fontSize: 13 }}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </YStack>
              </XStack>

              <XStack gap={16} flexWrap="wrap">
                <YStack flex={1} minWidth={150} gap={4}>
                  <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase">Interest Type</Label>
                  <select 
                    name="interest_type" 
                    defaultValue="Standard Amortized"
                    style={{ height: 40, borderRadius: 6, border: '1px solid rgba(13,61,61,0.1)', padding: '0 10px', fontSize: 13 }}
                  >
                    {INTEREST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </YStack>
                <YStack flex={1} minWidth={150} gap={4}>
                  <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase">Interest Basis</Label>
                  <select 
                    name="interest_basis" 
                    defaultValue="Actual/365"
                    style={{ height: 40, borderRadius: 6, border: '1px solid rgba(13,61,61,0.1)', padding: '0 10px', fontSize: 13 }}
                  >
                    {INTEREST_BASIS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </YStack>
              </XStack>

              <YStack gap={4}>
                <Label fontSize={11} fontWeight="700" color="$brandTextSub" textTransform="uppercase">First Payment Date (Optional)</Label>
                <Input 
                  type="date" 
                  name="payment_start_date" 
                  borderRadius={8}
                  borderColor="rgba(13,61,61,0.1)"
                  focusStyle={{ borderColor: '$brandAccent' }}
                  textAlign="center"
                  paddingLeft={32}
                />
                <Text fontSize={10} color="$brandTextSub">Used for broken-period interest calculations.</Text>
              </YStack>
            </YStack>
          )}

          {message && (
            <YStack padding={12} backgroundColor={message.type === 'success' ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)'} borderRadius={8}>
              <Text fontSize={13} color={message.type === 'success' ? '#059669' : '#DC2626'}>{message.text}</Text>
            </YStack>
          )}

          <Button 
            disabled={loading}
            onPress={(e) => {
              const form = (e.target as any).closest('form')
              if (form) form.requestSubmit()
            }}
            backgroundColor="$brandPrimary"
            height={48}
            borderRadius={8}
          >
            {loading ? <Spinner color="white" /> : <Text color="white" fontWeight="700">CREATE LOAN</Text>}
          </Button>
        </YStack>
      </form>
    </YStack>
  )
}
