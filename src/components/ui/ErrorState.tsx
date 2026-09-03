import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { useTheme } from '@/constants/theme';
import { Button } from './Button';

export interface ErrorStateProps extends ViewProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  style,
  ...props
}: ErrorStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]} {...props}>
      <View style={[styles.iconCircle, { backgroundColor: theme.errorLight }]}>
        <Text style={[styles.iconText, { color: theme.error }]}>!</Text>
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
      {onRetry ? (
        <Button
          title="Try Again / ફરી પ્રયાસ કરો"
          variant="outline"
          onPress={onRetry}
          style={styles.retryButton}
          size="md"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 24,
    fontWeight: '800',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 320,
  },
  retryButton: {
    minWidth: 160,
  },
});
