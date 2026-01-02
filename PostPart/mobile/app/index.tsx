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
      const { data: { session } } = await supabase.auth.getSession();
      
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

