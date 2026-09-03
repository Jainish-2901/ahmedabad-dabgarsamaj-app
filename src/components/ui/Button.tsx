import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { useTheme } from '@/constants/theme';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  ...props
}: ButtonProps) {
  const theme = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          container: { backgroundColor: theme.primaryLight },
          text: { color: theme.primary },
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: theme.primary,
          },
          text: { color: theme.primary },
        };
      case 'danger':
        return {
          container: { backgroundColor: theme.error },
          text: { color: '#FFFFFF' },
        };
      case 'ghost':
        return {
          container: { backgroundColor: 'transparent' },
          text: { color: theme.primary },
        };
      case 'primary':
      default:
        return {
          container: { backgroundColor: theme.primary },
          text: { color: '#FFFFFF' },
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          paddingVertical: 8,
          paddingHorizontal: 14,
          fontSize: 13,
          borderRadius: 8,
        };
      case 'lg':
        return {
          paddingVertical: 16,
          paddingHorizontal: 24,
          fontSize: 16,
          borderRadius: 14,
        };
      case 'md':
      default:
        return {
          paddingVertical: 12,
          paddingHorizontal: 18,
          fontSize: 15,
          borderRadius: 10,
        };
    }
  };

  const vStyle = getVariantStyles();
  const sStyle = getSizeStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[
        styles.base,
        vStyle.container,
        {
          paddingVertical: sStyle.paddingVertical,
          paddingHorizontal: sStyle.paddingHorizontal,
          borderRadius: sStyle.borderRadius,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={vStyle.text.color}
          style={styles.loader}
        />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text
            style={[
              styles.text,
              vStyle.text,
              { fontSize: sStyle.fontSize, marginLeft: icon ? 8 : 0 },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  loader: {
    paddingVertical: 2,
  },
});
