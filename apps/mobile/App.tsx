import "./global.css";
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { supabase } from './src/lib/supabase/client';
import { Session } from '@supabase/supabase-js';
import { DashboardScreen } from './src/screens/DashboardScreen';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {session ? (
        <DashboardScreen />
      ) : (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-3xl font-bold text-brand-primary">StashFlow</Text>
          <Text className="text-lg mt-2 text-gray-600 text-center mb-8">
            Please log in to manage your finances.
          </Text>
          <View className="bg-gray-100 p-4 rounded-xl w-full">
            <Text className="text-center text-gray-400 font-mono italic">
              [ AuthSession Login Placeholder ]
            </Text>
          </View>
        </View>
      )}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}
