import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator';
import { Ionicons } from '@expo/vector-icons';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sendResetOtp, verifyOtpAndResetPassword } = useAuth();
  const theme = useTheme();

  const topPadding = Math.max(insets.top, 20) + 16;
  const bottomPadding = Math.max(insets.bottom, 20) + 16;

  // 1: Enter Identifier, 2: Enter OTP & New Password, 3: Completed Successfully
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [identifier, setIdentifier] = useState('');
  const [resolvedEmail, setResolvedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [otpSentNotice, setOtpSentNotice] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Helper to mask email for privacy e.g. j***r@gmail.com
  const maskEmail = (email: string) => {
    if (!email || !email.includes('@')) return email;
    const [name, domain] = email.split('@');
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
  };

  // Step 1: Send OTP to Registered Email
  const handleSendOtp = async () => {
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('કૃપા કરીને આપનો રજીસ્ટર્ડ મોબાઈલ નંબર અથવા ઈમેઈલ દાખલ કરો.');
      return;
    }

    setLoading(true);
    const res = await sendResetOtp(identifier.trim());
    setLoading(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else {
      const email = res.email || identifier.trim();
      setResolvedEmail(email);
      setStep(2);
      setCooldown(60); // 60 seconds cooldown
      setOtpSentNotice(`આપના રજીસ્ટર્ડ ઈમેઈલ (${maskEmail(email)}) પર ૬ આંકડાનો OTP મોકલવામાં આવ્યો છે.`);
    }
  };

  // Step 2: Verify OTP and Reset Password
  const handleVerifyOtpAndReset = async () => {
    setErrorMessage('');

    if (!otp.trim() || otp.trim().length < 6) {
      setErrorMessage('કૃપા કરીને આપના ઈમેઈલ પર આવેલ ૬ આંકડાનો OTP દાખલ કરો.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('નવો પાસવર્ડ ઓછામાં ઓછો ૬ અક્ષરનો હોવો જોઈએ.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('બંને પાસવર્ડ સરખા નથી. કૃપા કરીને ફરીથી ચકાસો.');
      return;
    }

    setLoading(true);
    const res = await verifyOtpAndResetPassword(resolvedEmail, otp.trim(), newPassword);
    setLoading(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else {
      // Step 3: Successfully completed!
      setStep(3);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: topPadding,
            paddingBottom: bottomPadding,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            Reset Password via OTP
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            ઈમેઈલ OTP દ્વારા નવો પાસવર્ડ સેટ કરો
          </Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {errorMessage ? (
            <View style={[styles.errorBanner, { backgroundColor: theme.errorLight, borderColor: theme.error }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Ionicons name="alert-circle" size={16} color={theme.error} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.error }}>ધ્યાન આપો / Notice</Text>
              </View>
              <Text style={[styles.errorBannerText, { color: theme.error }]}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {step === 3 ? (
            /* STEP 3: FINAL SUCCESS SCREEN */
            <View style={[styles.successBanner, { backgroundColor: theme.successLight, borderColor: theme.success }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                <Text style={{ fontSize: 15, fontWeight: '800', color: theme.success }}>સફળતા / Success</Text>
              </View>
              <Text style={[styles.successBannerText, { color: theme.success }]}>
                આપનો નવો પાસવર્ડ સફળતાપૂર્વક સેટ થઈ ગયો છે! હવે આપ નવા પાસવર્ડ વડે લૉગિન કરી શકો છો.
              </Text>
              <Button
                title="Login with New Password / લોગિન કરો →"
                onPress={() => router.replace('/(auth)/login' as any)}
                size="md"
                style={{ marginTop: 16 }}
              />
            </View>
          ) : step === 1 ? (
            /* STEP 1: Enter Identifier & Send OTP */
            <>
              <Text style={[styles.instructions, { color: theme.textSecondary }]}>
                આપના એકાઉન્ટનો રજીસ્ટર્ડ મોબાઈલ નંબર અથવા ઈમેઈલ નાખીને ઈમેઈલ પર OTP મેળવો.
              </Text>

              <Input
                label="Email or Mobile Number / ઈમેઈલ અથવા મોબાઈલ નંબર *"
                placeholder="e.g. 9773272749 or user@example.com"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                keyboardType="default"
              />

              <Button
                title="Send OTP to Email / OTP મોકલો 📩"
                onPress={handleSendOtp}
                loading={loading}
                size="lg"
                style={styles.actionButton}
              />
            </>
          ) : (
            /* STEP 2: Enter OTP & New Password */
            <>
              {otpSentNotice ? (
                <View style={[styles.infoBanner, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
                  <Ionicons name="mail-unread-outline" size={16} color={theme.primary} />
                  <Text style={[styles.infoBannerText, { color: theme.primary }]}>
                    {otpSentNotice}
                  </Text>
                </View>
              ) : null}

              <View style={styles.stepHeaderRow}>
                <Text style={[styles.instructions, { color: theme.textSecondary, marginBottom: 0, flex: 1 }]}>
                  ઈમેઈલ પર આવેલ ૬ આંકડાનો OTP અને નવો પાસવર્ડ દાખલ કરો:
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setStep(1);
                    setOtp('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setErrorMessage('');
                  }}
                  style={{ padding: 4 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary }}>
                    ✏️ Change / બદલો
                  </Text>
                </TouchableOpacity>
              </View>

              <Input
                label="Enter 6-Digit OTP / ૬ આંકડાનો OTP *"
                placeholder="e.g. 123456"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                leftIcon={<Ionicons name="key-outline" size={18} color={theme.textSecondary} />}
              />

              <Input
                label="New Password / નવો પાસવર્ડ *"
                placeholder="ઓછામાં ઓછા ૮ અક્ષર (Min 8 chars)"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                rightIcon={
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowPassword(!showPassword)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                }
              />

              {/* Password Strength Indicator & Live Suggestions */}
              <PasswordStrengthIndicator password={newPassword} />

              <Input
                label="Confirm New Password / નવો પાસવર્ડ ફરીથી નાખો *"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                rightIcon={
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                }
              />

              <Button
                title="Verify OTP & Reset Password / પાસવર્ડ સેવ કરો"
                onPress={handleVerifyOtpAndReset}
                loading={loading}
                size="lg"
                style={styles.actionButton}
              />

              <TouchableOpacity
                onPress={() => {
                  if (cooldown === 0) {
                    handleSendOtp();
                  }
                }}
                disabled={loading || cooldown > 0}
                style={{ alignItems: 'center', marginTop: 14 }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: cooldown > 0 ? theme.textSecondary : theme.primary,
                  }}
                >
                  {cooldown > 0
                    ? `⏳ Resend OTP in ${cooldown}s (રાહ જુઓ)`
                    : '🔄 Resend OTP / ફરીથી OTP મોકલો'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(auth)/login' as any);
              }
            }}
          >
            <Text style={[styles.backLink, { color: theme.primary }]}>
              ← Back to Login / પાછા જાઓ
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    elevation: 3,
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)',
  },
  instructions: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  infoBannerText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  successBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  successBannerText: {
    fontSize: 13,
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 6,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  backLink: {
    fontSize: 15,
    fontWeight: '700',
  },
});
