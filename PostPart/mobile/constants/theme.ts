// PostPart Mobile App Design System
// Modern, clean, child-focused theme

export const Colors = {
  // Primary palette - PostPart pink/magenta (matching website)
  primary: '#E91E63',
  primaryLight: '#F06292',
  primaryDark: '#C2185B',
  
  // Accent - PostPart purple (matching website)
  accent: '#9C27B0',
  accentLight: '#BA68C8',
  accentDark: '#7B1FA2',
  
  // Backgrounds - Warm, child-friendly
  background: '#FFF9F5',        // Soft warm white
  backgroundLight: '#FFFBF7',   // Lighter warm
  backgroundDark: '#FFF3E9',    // Warm peachy
  surface: '#FFFFFF',
  
  // Text - Better contrast with white backgrounds
  text: '#2C3E50',
  textLight: '#5A6C7D',
  textMuted: '#95A5A6',
  textInverse: '#FFFFFF',
  
  // Status colors - Soft, child-friendly
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#E91E63',
  info: '#2196F3',
  
  // Border colors - Subtle on white
  border: '#E8E8E8',
  borderLight: '#F5F5F5',
  borderDark: '#DADADA',
  divider: '#F0F0F0',
  
  // Verified badge
  verified: '#E91E63',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
  
  // Shadows
  shadow: 'rgba(0, 0, 0, 0.08)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Re-export Shadows from shadows.ts for cross-platform compatibility
export { Shadows } from './shadows';

export const Animation = {
  fast: 200,
  normal: 300,
  slow: 500,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 9999,
};

export const Typography = {
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 40,
  },
  
  // Font weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
};

export const Layout = {
  screenPadding: Spacing.lg,
  cardPadding: Spacing.md,
  buttonHeight: 48,
  inputHeight: 52,
  headerHeight: 60,
  tabBarHeight: 65,
};
