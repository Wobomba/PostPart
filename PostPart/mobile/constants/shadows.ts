import { Platform, ViewStyle } from 'react-native';

/**
 * Cross-platform shadow helper
 * Uses proper shadow syntax for each platform
 */

const createShadow = (
  shadowColor: string,
  shadowOffset: { width: number; height: number },
  shadowOpacity: number,
  shadowRadius: number,
  elevation: number
): ViewStyle => {
  if (Platform.OS === 'web') {
    // Web uses boxShadow CSS property
    return {
      boxShadow: `${shadowOffset.width}px ${shadowOffset.height}px ${shadowRadius}px rgba(0, 0, 0, ${shadowOpacity})`,
    } as ViewStyle;
  }
  
  // iOS uses shadow properties, Android uses elevation
  return {
    shadowColor,
    shadowOffset,
    shadowOpacity,
    shadowRadius,
    elevation,
  };
};

export const Shadows = {
  small: createShadow('#000', { width: 0, height: 2 }, 0.05, 4, 2),
  medium: createShadow('#000', { width: 0, height: 4 }, 0.1, 8, 4),
  large: createShadow('#000', { width: 0, height: 8 }, 0.15, 16, 8),
};

