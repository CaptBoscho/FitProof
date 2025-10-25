import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { CONFIG } from '../constants/config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PointsCelebrationProps {
  points: number;
  onComplete?: () => void;
  visible: boolean;
}

/**
 * Animated celebration component that shows when points are earned
 * Displays floating "+X" text with fade-out animation
 */
export const PointsCelebration: React.FC<PointsCelebrationProps> = ({
  points,
  onComplete,
  visible
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && points > 0) {
      // Reset animations
      fadeAnim.setValue(1);
      translateYAnim.setValue(0);
      scaleAnim.setValue(0.5);

      // Run celebration animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: -100,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onComplete) {
          onComplete();
        }
      });
    }
  }, [visible, points, fadeAnim, translateYAnim, scaleAnim, onComplete]);

  if (!visible || points === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.celebrationContainer,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: translateYAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <Text style={styles.pointsText}>+{points}</Text>
        <Text style={styles.pointsLabel}>POINTS</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  celebrationContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.95)',
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  pointsText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  pointsLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
});
