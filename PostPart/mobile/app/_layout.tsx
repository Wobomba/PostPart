import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { UserDataProvider } from '../contexts/UserDataContext';

// Suppress errors in LogBox - we handle them gracefully
LogBox.ignoreLogs([
  'refresh token',
  'Refresh Token',
  'refresh_token',
  'refresh token not found',
  'Invalid refresh token',
  'expo-notifications',
  'Expo Go',
  'android push notifications',
  'remote notifications',
  'was removed from Expo Go',
  'Use a development build',
]);

function NotificationHandler() {
  const router = useRouter();
  const segments = useSegments();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Handle notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // You can show a custom in-app notification here if needed
    });

    // Handle notification taps (when user taps on notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;
      
      // Navigate to notification detail if notificationId is provided
      if (data?.notificationId) {
        // Only navigate if user is authenticated (not on auth screens)
        const isAuthenticated = !segments.includes('(auth)');
        if (isAuthenticated) {
          router.push(`/notification-detail?id=${data.notificationId}`);
        }
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [router, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <UserDataProvider>
      <NotificationHandler />
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

