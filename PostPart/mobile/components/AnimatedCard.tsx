import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import { Card } from './Card';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

/**
 * AnimatedCard - Card component with fade-in and slide-up animation
 * Provides smooth entrance animation for cards
 */
export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  delay = 0,
  variant = 'elevated',
  padding = 'medium',
  style,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <Card variant={variant} padding={padding} style={style}>
        {children}
      </Card>
    </Animated.View>
  );
};

