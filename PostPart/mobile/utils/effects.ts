import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptic Feedback Utilities
 * Provides tactile feedback for user interactions
 */

export const HapticFeedback = {
  /**
   * Light haptic feedback for subtle interactions
   * Use for: Button taps, selection changes, minor interactions
   */
  light: () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },

  /**
   * Medium haptic feedback for standard interactions
   * Use for: Primary button presses, important selections
   */
  medium: () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  },

  /**
   * Heavy haptic feedback for critical interactions
   * Use for: Delete actions, critical confirmations
   */
  heavy: () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  },

  /**
   * Success haptic feedback
   * Use for: Successful operations, confirmations
   */
  success: () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },

  /**
   * Warning haptic feedback
   * Use for: Warning messages, cautionary actions
   */
  warning: () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  },

  /**
   * Error haptic feedback
   * Use for: Errors, failed operations
   */
  error: () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  },

  /**
   * Selection haptic feedback
   * Use for: Picker/selector changes, carousel scrolling
   */
  selection: () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.selectionAsync();
    }
  },
};

/**
 * Animation timing constants
 * Standard durations for consistent animations
 */
export const AnimationTiming = {
  fast: 150,      // Quick transitions
  normal: 250,    // Standard animations
  slow: 400,      // Slower, more dramatic animations
  verySlow: 600,  // Very slow, emphasis animations
};

/**
 * Animation easing presets
 */
export const AnimationEasing = {
  easeInOut: 'ease-in-out',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  linear: 'linear',
};

