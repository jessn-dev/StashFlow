import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getDashboardSummary, getRecentTransactions } from '@fintrack/api'
import { formatCurrency, DashboardSummary, Transaction } from '@fintrack/core'

export function DashboardScreen() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const fetchData = useCallback(async () => {
    try {
      const [summaryData, txData] = await Promise.all([
        getDashboardSummary(supabase),
        getRecentTransactions(supabase)
      ])
      setSummary(summaryData)
      setTransactions(txData)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchData()
  }, [fetchData])

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D3D3D" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Navbar Mirror */}
      <View style={styles.navbar}>
        <View style={styles.brandContainer}>
          <View style={styles.brandDot} />
          <Text style={styles.brandText}>FinTrack</Text>
        </View>
        <TouchableOpacity
          onPress={async () => {
            const { error } = await supabase.auth.signOut()
            if (error) Alert.alert('Sign Out Failed', error.message)
          }}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D3D3D" />
        }
      >
        <Text style={styles.userEmail}>{session?.user?.email}</Text>
        <Text style={styles.header}>Overview</Text>

        {/* Wealth Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.card, styles.shadow]}>
            <Text style={styles.cardLabel}>Net Worth</Text>
            <Text style={styles.netWorthValue}>
              {summary ? formatCurrency(summary.netWorth) : '$0.00'}
            </Text>
            <Text style={styles.cardSubtext}>
              {summary?.netWorth === 0 ? 'Connect accounts to begin' : 'Your total financial value'}
            </Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.card, styles.shadow, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.cardLabel}>Total Assets</Text>
              <Text style={styles.assetValue}>
                {summary ? formatCurrency(summary.totalAssets) : '$0.00'}
              </Text>
            </View>
            <View style={[styles.card, styles.shadow, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.cardLabel}>Liabilities</Text>
              <Text style={styles.liabilityValue}>
                {summary ? formatCurrency(summary.totalLiabilities) : '$0.00'}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Transactions Module */}
        <View style={[styles.transactionsModule, styles.shadow]}>
          <View style={styles.moduleHeader}>
            <Text style={styles.moduleTitle}>Recent Transactions</Text>
          </View>

          {transactions.length > 0 ? (
            <View>
              {transactions.map((tx) => (
                <View key={tx.id} style={styles.transactionItem}>
                  <View style={styles.txInfo}>
                    <Text style={styles.txMainText}>
                      {tx.type === 'income' ? tx.source : tx.description}
                    </Text>
                    <Text style={styles.txSubText}>
                      {new Date(tx.date).toLocaleDateString()} • {tx.type === 'income' ? 'Income' : tx.category}
                    </Text>
                  </View>
                  <View style={styles.txAmountContainer}>
                    <Text style={[
                      styles.txAmount,
                      tx.type === 'income' ? styles.incomeText : styles.expenseText
                    ]}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                    </Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View All Transactions</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIcon}>+</Text>
              </View>
              <Text style={styles.emptyTitle}>No data available</Text>
              <Text style={styles.emptySubtext}>
                You haven't added any transactions yet. Start tracking your expenses to see your insights here.
              </Text>
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>Add Transaction</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EFEFEF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navbar: {
    height: 64,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(13, 61, 61, 0.1)',
  },
  brandContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1A7A7A', marginRight: 8 },
  brandText: { fontSize: 20, fontWeight: 'bold', color: '#0D3D3D' },
  signOutText: { fontSize: 12, fontWeight: 'bold', color: '#1A7A7A', textTransform: 'uppercase', letterSpacing: 1 },
  scrollContainer: { padding: 20, paddingBottom: 40 },
  userEmail: { fontSize: 12, color: '#444444', opacity: 0.7, marginBottom: 4, fontWeight: '500' },
  header: { fontSize: 32, fontWeight: 'bold', color: '#0D3D3D', marginBottom: 24 },
  summaryContainer: { marginBottom: 24 },
  card: { backgroundColor: '#FFFFFF', padding: 24, borderBottomWidth: 0, marginBottom: 16 },
  row: { flexDirection: 'row', marginBottom: 0 },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(13, 61, 61, 0.05)',
  },
  cardLabel: { fontSize: 10, fontWeight: 'bold', color: '#444444', opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  netWorthValue: { fontSize: 40, fontWeight: 'bold', color: '#0D3D3D' },
  assetValue: { fontSize: 24, fontWeight: 'bold', color: '#0D3D3D' },
  liabilityValue: { fontSize: 24, fontWeight: 'bold', color: '#444444', opacity: 0.8 },
  cardSubtext: { fontSize: 10, color: '#1A7A7A', marginTop: 12, fontWeight: '600' },
  transactionsModule: { backgroundColor: '#FFFFFF' },
  moduleHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(13, 61, 61, 0.1)' },
  moduleTitle: { fontSize: 18, fontWeight: 'bold', color: '#0D3D3D' },
  transactionItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(13, 61, 61, 0.05)',
    alignItems: 'center',
  },
  txInfo: { flex: 1 },
  txMainText: { fontSize: 14, fontWeight: 'bold', color: '#0D3D3D' },
  txSubText: { fontSize: 12, color: '#444444', opacity: 0.5, marginTop: 2 },
  txAmountContainer: { alignItems: 'flex-end' },
  txAmount: { fontSize: 14, fontWeight: 'bold' },
  incomeText: { color: '#1A7A7A' },
  expenseText: { color: '#444444' },
  viewAllButton: { padding: 20, alignItems: 'center' },
  viewAllText: { fontSize: 12, fontWeight: 'bold', color: '#1A7A7A', textTransform: 'uppercase', letterSpacing: 1 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFEFEF', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(13, 61, 61, 0.1)' },
  emptyIcon: { fontSize: 24, color: '#1A7A7A', fontWeight: '300' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0D3D3D', marginBottom: 8 },
  emptySubtext: { fontSize: 12, color: '#444444', opacity: 0.6, textAlign: 'center', lineHeight: 18, marginBottom: 24 },
  addButton: { backgroundColor: '#0D3D3D', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 0 },
  addButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
})
