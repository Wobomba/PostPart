import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { checkParentStatus, showStatusAlert } from '../utils/parentStatus';
import { Colors, Typography, Spacing } from '../constants/theme';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // If there's an error with the session, clear it
      if (sessionError) {
        // Check for 403 Forbidden (invalid/expired session)
        if (sessionError.status === 403 || sessionError.message?.includes('403') || sessionError.message?.includes('Forbidden')) {
          console.warn('403 Forbidden - Session invalid, clearing session:', sessionError.message);
          await supabase.auth.signOut();
          setTimeout(() => {
            router.replace('/(auth)/welcome');
          }, 2000);
          return;
        }
        
        // Check specifically for refresh token errors
        if (sessionError.message?.includes('Refresh Token') || 
            sessionError.message?.includes('refresh_token') ||
            sessionError.message?.includes('Invalid Refresh Token')) {
          console.warn('Invalid refresh token, clearing session:', sessionError.message);
          await supabase.auth.signOut();
          setTimeout(() => {
            router.replace('/(auth)/welcome');
          }, 2000);
          return;
        }
        console.log('Session error, clearing:', sessionError.message);
        await supabase.auth.signOut();
        setTimeout(() => {
          router.replace('/(auth)/welcome');
        }, 2000);
        return;
      }
      
      // Also check getUser to catch any refresh token or 403 errors there
      try {
        const { data: { user }, error: getUserError } = await supabase.auth.getUser();
        if (getUserError) {
          // Check for 403 Forbidden (invalid/expired session)
          if (getUserError.status === 403 || getUserError.message?.includes('403') || getUserError.message?.includes('Forbidden')) {
            console.warn('403 Forbidden - Session invalid, clearing session:', getUserError.message);
            await supabase.auth.signOut();
            setTimeout(() => {
              router.replace('/(auth)/welcome');
            }, 2000);
            return;
          }
          
          if (getUserError.message?.includes('Refresh Token') || 
              getUserError.message?.includes('refresh_token') ||
              getUserError.message?.includes('Invalid Refresh Token')) {
            console.warn('Invalid refresh token in getUser, clearing session:', getUserError.message);
            await supabase.auth.signOut();
            setTimeout(() => {
              router.replace('/(auth)/welcome');
            }, 2000);
            return;
          }
        }
      } catch (getUserErr) {
        // Check for 403 in catch block
        if (getUserErr?.status === 403 || getUserErr?.message?.includes('403') || getUserErr?.message?.includes('Forbidden')) {
          console.warn('403 Forbidden in getUser catch, clearing session');
          await supabase.auth.signOut();
          setTimeout(() => {
            router.replace('/(auth)/welcome');
          }, 2000);
          return;
        }
        // Ignore other getUser errors, continue with session check
      }
      
      // Delay for splash screen effect
      setTimeout(async () => {
        if (session) {
          // Allow all authenticated users to access home
          // Inactive users will see a message on the home screen
          router.replace('/(tabs)/home');
        } else {
          router.replace('/(auth)/welcome');
        }
      }, 2000);
    } catch (error) {
      console.error('Error checking auth:', error);
      // Clear any invalid session data
      await supabase.auth.signOut();
      setTimeout(() => {
        router.replace('/(auth)/welcome');
      }, 2000);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        {/* PostPart Logo */}
        <Image
          source={require('../assets/postpart-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      
      <ActivityIndicator
        size="large"
        color={Colors.primary}
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 240,
    height: 240,
  },
  loader: {
    marginTop: Spacing.xl,
  },
});

