import React, { useState } from 'react';
import {
  Image,
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
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUpWithEmail } = useAuth();
  const theme = useTheme();

  const topPadding = Math.max(insets.top, 20) + 16;
  const bottomPadding = Math.max(insets.bottom, 20) + 16;

  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Password Strength Rules
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

  const handleSignup = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password || !mobile.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('પાસવર્ડ ઓછામાં ઓછો ૮ અક્ષરનો હોવો જોઈએ. (Password must be at least 8 characters long.)');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await signUpWithEmail(email, password, mobile);
    setLoading(false);

    if (error) {
      setErrorMessage(error);
    } else {
      setSuccessMessage('Account created successfully!');
      setTimeout(() => {
        router.replace('/(family)/setup-family' as any);
      }, 500);
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
          <Image
            source={require('@/../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: theme.text }]}>
            અમદાવાદ ડબગર સમાજ પરિવાર રજીસ્ટ્રેશન
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            પરિવાર વડા તરીકે નવું ખાતું બનાવો
          </Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {errorMessage ? (
            <View style={[styles.errorBanner, { backgroundColor: theme.errorLight, borderColor: theme.error }]}>
              <Text style={[styles.errorBannerText, { color: theme.error }]}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={[styles.successBanner, { backgroundColor: theme.successLight, borderColor: theme.success }]}>
              <Text style={[styles.successBannerText, { color: theme.success }]}>
                {successMessage}
              </Text>
            </View>
          ) : null}

          <Input
            label="Email Address / ઈમેઈલ *"
            placeholder="e.g. familyhead@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Input
            label="Mobile Number / મોબાઈલ નંબર *"
            placeholder="e.g. 9876543210"
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            maxLength={10}
          />

          {/* Password with Eye toggle */}
          <Input
            label="Password / પાસવર્ડ *"
            placeholder="Min 8 chars recommended"
            value={password}
            onChangeText={setPassword}
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

          {/* Live Password Strength Indicator & Suggestions */}
          {password.length > 0 ? (
            <View style={[styles.strengthBox, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.strengthHeader}>
                <Text style={[styles.strengthTitle, { color: theme.textSecondary }]}>
                  Password Strength:
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
                    Uppercase letter (A-Z)
                  </Text>
                </View>

                <View style={styles.ruleRow}>
                  <Ionicons
                    name={hasNumber ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasNumber ? '#10B981' : theme.textMuted}
                  />
                  <Text style={[styles.ruleText, { color: hasNumber ? theme.text : theme.textMuted }]}>
                    Number (0-9)
                  </Text>
                </View>

                <View style={styles.ruleRow}>
                  <Ionicons
                    name={hasSpecialChar ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasSpecialChar ? '#10B981' : theme.textMuted}
                  />
                  <Text style={[styles.ruleText, { color: hasSpecialChar ? theme.text : theme.textMuted }]}>
                    Special character (@, #, $, %, etc.)
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Confirm Password with Eye toggle */}
          <Input
            label="Confirm Password / પાસવર્ડ ફરીથી લખો *"
            placeholder="Re-enter your password"
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
            title="Create Account / રજીસ્ટ્રેશન કરો"
            onPress={handleSignup}
            loading={loading}
            size="lg"
            style={styles.signupButton}
          />
        </View>

        {/* Footer link to sign in */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Already have a family account?
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(auth)/login' as any)}
          >
            <Text style={[styles.signInLink, { color: theme.primary }]}>
              Sign In / પ્રવેશ કરો
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
    padding: 20,
    justifyContent: 'center',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
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
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 3,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
  },
  strengthBox: {
    borderRadius: 10,
    padding: 12,
    marginTop: -6,
    marginBottom: 16,
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
    fontWeight: '800',
  },
  strengthBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
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
  signupButton: {
    marginTop: 10,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  successBanner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  footerText: {
    fontSize: 14,
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
