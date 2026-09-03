import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useTheme } from '@/constants/theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  style,
  ...props
}: InputProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: theme.text }]}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.card,
            borderColor: error ? theme.error : theme.border,
          },
        ]}
      >
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
        <TextInput
          placeholderTextColor={theme.textMuted}
          style={[
            styles.input,
            { color: theme.text },
            leftIcon ? { paddingLeft: 0 } : undefined,
            rightIcon ? { paddingRight: 0 } : undefined,
            style,
          ]}
          {...props}
        />
        {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: theme.error }]}>
          {error}
        </Text>
      ) : helperText ? (
        <Text style={[styles.helperText, { color: theme.textSecondary }]}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
});
