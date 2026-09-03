/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform, useColorScheme } from 'react-native';

export const Colors = {
  light: {
    primary: '#1E6091',
    primaryLight: '#E6F0F8',
    primaryDark: '#133D5E',
    accent: '#F39C12',
    text: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    background: '#F8FAFC',
    card: '#FFFFFF',
    border: '#E2E8F0',
    backgroundElement: '#F1F5F9',
    backgroundSelected: '#E2E8F0',
    success: '#10B981',
    successLight: '#ECFDF5',
    error: '#EF4444',
    errorLight: '#FEF2F2',
    warning: '#F59E0B',
    warningLight: '#FFFBEB',
  },
  dark: {
    primary: '#38BDF8',
    primaryLight: '#082F49',
    primaryDark: '#0284C7',
    accent: '#FBBF24',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    background: '#0F172A',
    card: '#1E293B',
    border: '#334155',
    backgroundElement: '#1E293B',
    backgroundSelected: '#334155',
    success: '#34D399',
    successLight: '#064E3B',
    error: '#F87171',
    errorLight: '#450A0A',
    warning: '#FBBF24',
    warningLight: '#451A03',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export function getTheme(scheme?: string | null) {
  return scheme === 'dark' ? Colors.dark : Colors.light;
}

export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
