import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { useTheme } from '@/constants/theme';
import { Button } from './Button';

export interface EmptyStateProps extends ViewProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionTitle?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon,
  actionTitle,
  onAction,
  style,
  ...props
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]} {...props}>
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {description}
        </Text>
      ) : null}
      {actionTitle && onAction ? (
        <Button
          title={actionTitle}
          onPress={onAction}
          style={styles.actionButton}
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
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 320,
  },
  actionButton: {
    minWidth: 180,
  },
});
