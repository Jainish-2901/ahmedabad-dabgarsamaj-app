import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
  ViewProps,
} from 'react-native';
import { useTheme } from '@/constants/theme';

export interface LoadingStateProps extends ViewProps {
  message?: string;
  size?: 'small' | 'large';
  showLogo?: boolean;
}

export function LoadingState({
  message = 'Loading...',
  size = 'large',
  showLogo = true,
  style,
  ...props
}: LoadingStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]} {...props}>
      {showLogo ? (
        <Image
          source={require('@/../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      ) : null}
      <ActivityIndicator size={size} color={theme.primary} />
      {message ? (
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 16,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
