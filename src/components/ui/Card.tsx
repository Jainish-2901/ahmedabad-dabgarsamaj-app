import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewProps,
  useColorScheme,
} from 'react-native';
import { useTheme } from '@/constants/theme';

export interface CardProps extends ViewProps {
  onPress?: () => void;
  activeOpacity?: number;
}

export function Card({
  children,
  style,
  onPress,
  activeOpacity = 0.7,
  ...props
}: CardProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPress={onPress}
        style={cardStyle}
        {...(props as TouchableOpacityProps)}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginVertical: 6,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
});
