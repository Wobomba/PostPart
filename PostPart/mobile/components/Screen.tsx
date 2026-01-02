import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../constants/theme';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  topSpacing?: number; // Additional top spacing beyond safe area (default: 14dp)
}

/**
 * Reusable Screen wrapper component that provides:
 * - Safe area handling (status bar/notch)
 * - Consistent Instagram-style top spacing (14dp extra padding)
 * - Bottom safe area handling (if specified in edges)
 */
export const Screen: React.FC<ScreenProps> = ({
  children,
  style,
  edges = ['top'],
  topSpacing = 14, // Instagram-style spacing: 12-16dp, using 14dp as default
}) => {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.container, style]} edges={edges}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + topSpacing,
          },
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
});

