import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { CONFIG } from '../constants/config';

interface PointsDisplayProps {
  points: number;
  animated?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const PointsDisplay: React.FC<PointsDisplayProps> = ({
  points,
  animated = false,
  size = 'medium'
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const previousPoints = useRef(points);

  useEffect(() => {
    if (animated && points > previousPoints.current) {
      // Animate when points increase
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    previousPoints.current = points;
  }, [points, animated, scaleAnim]);

  const sizeStyles = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large,
  };

  return (
    <Animated.View
      style={[
        styles.container,
        sizeStyles[size],
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <Text style={[styles.label, size === 'large' && styles.labelLarge]}>POINTS</Text>
      <Text style={[styles.points, size === 'large' && styles.pointsLarge]}>
        {points.toLocaleString()}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: CONFIG.COLORS.PRIMARY,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  small: {
    padding: 8,
    borderRadius: 8,
  },
  medium: {
    padding: 12,
    borderRadius: 12,
  },
  large: {
    padding: 20,
    borderRadius: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
    letterSpacing: 1,
  },
  labelLarge: {
    fontSize: 16,
    marginBottom: 8,
  },
  points: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CONFIG.COLORS.WHITE,
  },
  pointsLarge: {
    fontSize: 40,
  },
});
