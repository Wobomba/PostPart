import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/**
 * Reusable Screen wrapper component that provides:
 * - Safe area handling without extra padding
 * - Manual top inset to avoid double padding issue
 */
export const Screen: React.FC<ScreenProps> = ({
  children,
  style,
  edges = ['bottom'],
}) => {
  const insets = useSafeAreaInsets();
  
  // Only apply SafeAreaView edges for bottom (to avoid double top padding)
  // Manually add top inset via paddingTop
  const includesTop = edges?.includes('top');
  const safeEdges = edges?.filter(edge => edge !== 'top') || [];

  return (
    <SafeAreaView 
      style={[styles.container, style]} 
      edges={safeEdges as any}
    >
      <View style={[
          styles.content,
        includesTop ? { paddingTop: insets.top } : undefined
      ]}>
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

