import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export interface PasswordStrengthIndicatorProps {
  password?: string;
}

export function PasswordStrengthIndicator({ password = '' }: PasswordStrengthIndicatorProps) {
  const theme = useTheme();

  if (!password || password.length === 0) {
    return null;
  }

  // Strength rules
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const rulesPassed = [hasMinLength, hasUpperCase, hasNumber, hasSpecialChar].filter(Boolean).length;

  let strengthLabel = 'Weak / નબળો';
  let strengthColor = '#EF4444'; // Red
  let strengthPercent = 25;

  if (rulesPassed === 2) {
    strengthLabel = 'Fair / સાધારણ';
    strengthColor = '#F59E0B'; // Amber
    strengthPercent = 50;
  } else if (rulesPassed === 3) {
    strengthLabel = 'Good / સારો';
    strengthColor = '#3B82F6'; // Blue
    strengthPercent = 75;
  } else if (rulesPassed === 4) {
    strengthLabel = 'Strong / મજબૂત 💪';
    strengthColor = '#10B981'; // Green
    strengthPercent = 100;
  }

  return (
    <View style={[styles.strengthBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.strengthHeader}>
        <Text style={[styles.strengthTitle, { color: theme.textSecondary }]}>
          Password Strength / મજબૂતાઈ:
        </Text>
        <Text style={[styles.strengthLabelText, { color: strengthColor }]}>
          {strengthLabel}
        </Text>
      </View>

      {/* Strength Bar */}
      <View style={[styles.strengthBarBg, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.strengthBarFill,
            {
              width: `${strengthPercent}%`,
              backgroundColor: strengthColor,
            },
          ]}
        />
      </View>

      {/* Suggestions / Checkpoints */}
      <View style={styles.ruleList}>
        <View style={styles.ruleRow}>
          <Ionicons
            name={hasMinLength ? 'checkmark-circle' : 'ellipse-outline'}
            size={14}
            color={hasMinLength ? '#10B981' : theme.textMuted}
          />
          <Text style={[styles.ruleText, { color: hasMinLength ? theme.text : theme.textMuted }]}>
            At least 8 characters (ઓછામાં ઓછા ૮ અક્ષર)
          </Text>
        </View>

        <View style={styles.ruleRow}>
          <Ionicons
            name={hasUpperCase ? 'checkmark-circle' : 'ellipse-outline'}
            size={14}
            color={hasUpperCase ? '#10B981' : theme.textMuted}
          />
          <Text style={[styles.ruleText, { color: hasUpperCase ? theme.text : theme.textMuted }]}>
            Uppercase letter (A-Z) (મોટો અક્ષર)
          </Text>
        </View>

        <View style={styles.ruleRow}>
          <Ionicons
            name={hasNumber ? 'checkmark-circle' : 'ellipse-outline'}
            size={14}
            color={hasNumber ? '#10B981' : theme.textMuted}
          />
          <Text style={[styles.ruleText, { color: hasNumber ? theme.text : theme.textMuted }]}>
            Number (0-9) (આંકડો)
          </Text>
        </View>

        <View style={styles.ruleRow}>
          <Ionicons
            name={hasSpecialChar ? 'checkmark-circle' : 'ellipse-outline'}
            size={14}
            color={hasSpecialChar ? '#10B981' : theme.textMuted}
          />
          <Text style={[styles.ruleText, { color: hasSpecialChar ? theme.text : theme.textMuted }]}>
            Special character (@, #, $, %, etc.) (ખાસ ચિહ્ન)
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strengthBox: {
    padding: 12,
    borderRadius: 10,
    marginTop: -8,
    marginBottom: 14,
    borderWidth: 1,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  strengthTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  strengthLabelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  strengthBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  ruleList: {
    gap: 4,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ruleText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
