import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Brand Section */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/postpart-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>POSTPART</Text>
          <Text style={styles.tagline}>WELL MAMAS, WELL BABIES</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="qr-code-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Quick Check-In</Text>
              <Text style={styles.featureDescription}>Scan QR codes for instant access</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="business-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Verified Centers</Text>
              <Text style={styles.featureDescription}>Access trusted daycare facilities</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="shield-checkmark-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Safe & Secure</Text>
              <Text style={styles.featureDescription}>Your family's safety is our priority</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          title="Create Account"
          onPress={() => router.push('/(auth)/register')}
          icon="person-add"
          fullWidth
          size="large"
        />
        <Button
          title="Sign In"
          onPress={() => router.push('/(auth)/login')}
          variant="outline"
          icon="log-in"
          fullWidth
          size="large"
          style={styles.signInButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: Spacing.lg,
  },
  brandName: {
    fontSize: Typography.fontSize.huge,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary, // Pink color to match logo
    marginBottom: Spacing.xs,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text, // Black text to match branding
    textAlign: 'center',
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.5,
  },
  features: {
    gap: Spacing.lg,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textLight,
  },
  actions: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  signInButton: {
    marginTop: 0,
  },
});
