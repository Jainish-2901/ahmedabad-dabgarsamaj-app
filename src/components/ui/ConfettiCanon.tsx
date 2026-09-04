import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  shape: 'circle' | 'square' | 'strip';
  animValue: Animated.Value;
  vx: number; // velocity x
  vy: number; // velocity y
  rotDeg: number;
}

const CONFETTI_COLORS = [
  '#0284C7', // Primary Ocean Blue
  '#F59E0B', // Warm Amber
  '#EF4444', // Festive Red
  '#10B981', // Emerald Green
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#38BDF8', // Sky Blue
  '#FCD34D', // Gold
];

export interface ConfettiProps {
  count?: number;
}

export function ConfettiCanon({ count = 45 }: ConfettiProps) {
  const pieces = useRef<ConfettiPiece[]>([]);

  if (pieces.current.length === 0) {
    const originX = SCREEN_WIDTH / 2;
    const originY = SCREEN_HEIGHT * 0.42; // Center around app logo

    pieces.current = Array.from({ length: count }, (_, i) => {
      // Radiate outwards like a party popper explosion
      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.5 - 0.25);
      const speed = Math.random() * 180 + 100;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 60; // slight upward pop

      return {
        id: i,
        x: originX,
        y: originY,
        size: Math.floor(Math.random() * 8) + 6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        shape: i % 3 === 0 ? 'circle' : i % 3 === 1 ? 'strip' : 'square',
        animValue: new Animated.Value(0),
        vx,
        vy,
        rotDeg: Math.floor(Math.random() * 360),
      };
    });
  }

  useEffect(() => {
    const animations = pieces.current.map((p) =>
      Animated.timing(p.animValue, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );
    Animated.parallel(animations).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.current.map((p) => {
        const translateX = p.animValue.interpolate({
          inputRange: [0, 0.4, 1],
          outputRange: [0, p.vx, p.vx * 1.3],
        });

        // Add simulated gravity falling down
        const translateY = p.animValue.interpolate({
          inputRange: [0, 0.4, 1],
          outputRange: [0, p.vy, p.vy + 260],
        });

        const rotate = p.animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [`0deg`, `${p.rotDeg + 360}deg`],
        });

        const scale = p.animValue.interpolate({
          inputRange: [0, 0.15, 0.8, 1],
          outputRange: [0, 1.2, 1, 0],
        });

        const opacity = p.animValue.interpolate({
          inputRange: [0, 0.1, 0.7, 1],
          outputRange: [0, 1, 0.9, 0],
        });

        return (
          <Animated.View
            key={p.id}
            style={[
              {
                position: 'absolute',
                left: p.x,
                top: p.y,
                width: p.shape === 'strip' ? p.size * 1.8 : p.size,
                height: p.shape === 'strip' ? p.size * 0.6 : p.size,
                borderRadius: p.shape === 'circle' ? p.size / 2 : 2,
                backgroundColor: p.color,
                opacity,
                transform: [{ translateX }, { translateY }, { rotate }, { scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}
