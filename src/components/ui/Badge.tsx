import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { useTheme } from '@/constants/theme';

export interface BadgeProps extends ViewProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  size?: 'sm' | 'md';
}

export function Badge({
  label,
  variant = 'primary',
  size = 'md',
  style,
  ...props
}: BadgeProps) {
  const theme = useTheme();

  const getVariantColors = () => {
    switch (variant) {
      case 'success':
        return { bg: theme.successLight, text: theme.success };
      case 'warning':
        return { bg: theme.warningLight, text: theme.warning };
      case 'error':
        return { bg: theme.errorLight, text: theme.error };
      case 'neutral':
        return { bg: theme.backgroundElement, text: theme.textSecondary };
      case 'primary':
      default:
        return { bg: theme.primaryLight, text: theme.primary };
    }
  };

  const colors = getVariantColors();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          paddingVertical: isSm ? 2 : 4,
          paddingHorizontal: isSm ? 6 : 10,
          borderRadius: 6,
        },
        style,
      ]}
      {...props}
    >
      <Text
        style={[
          styles.text,
          { color: colors.text, fontSize: isSm ? 11 : 13 },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
});
