// Push notification utilities for mobile app
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Configure notification handler (only if not in Expo Go)
try {
  if (Constants.executionEnvironment !== 'storeClient') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (error) {
  // Silently fail if notifications can't be configured (e.g., in Expo Go)
  console.log('Notification handler setup skipped (Expo Go or unsupported environment)');
}

/**
 * Check if running in Expo Go (where push notifications don't work)
 */
function isExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}

/**
 * Register device for push notifications and store token in database
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Push notifications don't work in Expo Go (SDK 53+)
  if (isExpoGo()) {
    console.log('Push notifications are not available in Expo Go. Use a development build for push notification support.');
    return null;
  }

  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return null;
  }

  try {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'f35b4e99-1359-48d6-8b8d-863b14c3cebf', // From app.config.js
    });

    token = tokenData.data;
    console.log('Expo push token:', token);

    // Store token in database
    const { data: { user } } = await supabase.auth.getUser();
    if (user && token) {
      await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', user.id);
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'PostPart Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E91E63',
      });
    }

    return token;
  } catch (error: any) {
    // Handle Expo Go specific error gracefully
    if (error?.message?.includes('Expo Go') || error?.message?.includes('expo-notifications')) {
      console.log('Push notifications require a development build. Continuing without push notifications.');
      return null;
    }
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Clear push token when user logs out
 */
export async function clearPushToken(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ push_token: null })
        .eq('id', user.id);
    }
  } catch (error) {
    console.error('Error clearing push token:', error);
  }
}

