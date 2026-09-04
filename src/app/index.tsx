import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/constants/theme';
import { ConfettiCanon } from '@/components/ui/ConfettiCanon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RootSplashScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(20)).current;
  const welcomeFade = useRef(new Animated.Value(0)).current;
  const welcomeScale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    // 1. Entrance animation: Logo pops in with spring
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Title & Subtitle fade in slightly after logo
    Animated.parallel([
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 700,
        delay: 250,
        useNativeDriver: true,
      }),
      Animated.timing(contentSlide, {
        toValue: 0,
        duration: 700,
        delay: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // 3. "એપ માં આપનું હાર્દિક સ્વાગત છે 🙏" banner pops in
    Animated.parallel([
      Animated.timing(welcomeFade, {
        toValue: 1,
        duration: 600,
        delay: 600,
        useNativeDriver: true,
      }),
      Animated.spring(welcomeScale, {
        toValue: 1,
        friction: 6,
        delay: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // 4. Record splash start time
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= 3000 && !isLoading) {
        clearInterval(interval);
        if (!user) {
          router.replace('/(auth)/login' as any);
        } else {
          router.replace('/(family)/home' as any);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading, user, router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Festive Confetti Popper effect on launch */}
      <ConfettiCanon count={55} />

      <View style={styles.contentWrapper}>
        {/* Animated App Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Image
            source={require('@/../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Community Name & Subtitle */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: contentFade,
              transform: [{ translateY: contentSlide }],
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>
            અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા
          </Text>

          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Ahmedabad Dabgar Samaj Directory & Family Tree
          </Text>
        </Animated.View>

        {/* Welcome Text requested by user: "એપ માં આપનું હાર્દિક સ્વાગત છે 🙏" */}
        <Animated.View
          style={[
            styles.welcomeBadge,
            {
              opacity: welcomeFade,
              transform: [{ scale: welcomeScale }],
              backgroundColor: theme.primaryLight,
              borderColor: theme.primary,
            },
          ]}
        >
          <Text style={[styles.welcomeText, { color: theme.primary }]}>
            ✨ એપ માં આપનું હાર્દિક સ્વાગત છે 🙏
          </Text>
        </Animated.View>
      </View>

      {/* Bottom Loading Indicator */}
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.primary} style={{ marginBottom: 8 }} />
        <Text style={[styles.loadingHint, { color: theme.textMuted }]}>
          પ્રારંભ થઈ રહ્યું છે... (Starting...)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  contentWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 380,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 30px rgba(2, 132, 199, 0.18)',
      },
      default: {
        elevation: 6,
      },
    }),
  },
  logoImage: {
    width: 95,
    height: 95,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  welcomeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    marginTop: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  footer: {
    position: 'absolute',
    bottom: 42,
    alignItems: 'center',
  },
  loadingHint: {
    fontSize: 12,
    fontWeight: '600',
  },
});
