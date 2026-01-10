import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { UserDataProvider } from '../contexts/UserDataContext';

// Suppress refresh token errors in LogBox - we handle them gracefully
LogBox.ignoreLogs([
  'refresh token',
  'Refresh Token',
  'refresh_token',
  'refresh token not found',
  'Invalid refresh token',
]);

export default function RootLayout() {
  return (
    <UserDataProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFF9F5' }, // Warm, child-friendly background
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </UserDataProvider>
  );
}

