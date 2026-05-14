import React from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { formatCurrency } from '@stashflow/core';
import { useDashboardData } from '../hooks/useDashboardData';

export function DashboardScreen() {
  const { data, loading, error } = useDashboardData();

  if (loading) return <ActivityIndicator className="flex-1" size="large" color="#0070f3" />;
  if (error) return <View className="flex-1 items-center justify-center p-6"><Text className="text-red-500">{error}</Text></View>;
  if (!data) return null;

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <Text className="text-2xl font-bold mb-6">Dashboard</Text>
      
      <View className="flex-row flex-wrap justify-between">
        <MetricCard label="Net Worth" value={formatCurrency(data.netWorth, data.currency)} />
        <MetricCard label="Cash Flow" value={formatCurrency(data.monthlyCashFlow, data.currency)} />
        <MetricCard label="Liabilities" value={formatCurrency(data.totalLiabilities, data.currency)} />
        <MetricCard label="DTI" value={`${(data.dtiRatio * 100).toFixed(1)}%`} />
      </View>
    </ScrollView>
  );
}

function MetricCard({ label, value }: Readonly<{ label: string, value: string }>) {
  return (
    <View className="w-[48%] bg-white p-4 rounded-2xl shadow-sm mb-4 border border-gray-100">
      <Text className="text-gray-500 text-sm font-medium mb-1">{label}</Text>
      <Text className="text-lg font-bold text-gray-900">{value}</Text>
    </View>
  );
}
