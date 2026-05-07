import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createMobileClient } from '@stashflow/db/mobile';

export const supabase = createMobileClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    getItem: SecureStore.getItemAsync,
    setItem: SecureStore.setItemAsync,
    removeItem: SecureStore.deleteItemAsync,
  },
);
