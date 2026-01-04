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
      
      // If there's an error with the refresh token, clear the session
      if (sessionError) {
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
      
      // Also check getUser to catch any refresh token errors there
      try {
        const { data: { user }, error: getUserError } = await supabase.auth.getUser();
        if (getUserError) {
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
        // Ignore getUser errors, continue with session check
      }
      
      // Delay for splash screen effect
      setTimeout(async () => {
        if (session) {
          // Check parent status before allowing access
          const status = await checkParentStatus();
          
          if (!status.isActive) {
            // Parent is inactive or suspended - show alert and redirect to login
            showStatusAlert(status, () => {
              supabase.auth.signOut();
              router.replace('/(auth)/welcome');
            });
          } else {
            router.replace('/(tabs)/home');
          }
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
        
        <Text style={styles.title}>POSTPART</Text>
        <Text style={styles.subtitle}>WELL MAMAS, WELL BABIES</Text>
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
    marginBottom: Spacing.xxl,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.huge,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.5,
  },
  loader: {
    marginTop: Spacing.xl,
  },
});

