import React from 'react';
import { Alert, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import PWAInstallButton from './PWAInstallButton';

export interface TopBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function TopBar({
  title = 'અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા',
  showBack = false,
  onBack,
  rightAction,
}: TopBarProps) {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const safeTop = Math.max(insets.top, 12);

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Are you sure you want to log out of your family account?') : true;
      if (confirmed) {
        await signOut();
        router.replace('/(auth)/login' as any);
      }
      return;
    }

    Alert.alert('Log Out', 'Are you sure you want to log out of your family account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderBottomColor: theme.border,
          paddingTop: safeTop,
          height: 60 + safeTop,
        },
      ]}
    >
      <View style={styles.contentRow}>
        {showBack ? (
          <View style={styles.backHeaderSection}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (onBack) {
                  onBack();
                } else if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace((user ? '/(family)/home' : '/') as any);
                }
              }}
              style={[styles.backBtn, { backgroundColor: theme.backgroundElement }]}
            >
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </TouchableOpacity>

            <Text numberOfLines={1} style={[styles.backTitle, { color: theme.text }]}>
              {title}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(family)/about' as any)}
            style={styles.brandHeaderSection}
          >
            <Image
              source={require('@/../assets/images/logo.png')}
              style={[styles.brandLogo, { borderColor: theme.border }]}
              resizeMode="contain"
            />
            <View style={styles.titleBox}>
              <Text numberOfLines={1} style={[styles.brandTitle, { color: theme.text }]}>
                {title}
              </Text>
              <Text numberOfLines={1} style={[styles.brandSubtitle, { color: theme.primary }]}>
                પરિચય પુસ્તિકા • વંશાવલી
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.rightSection}>
          <PWAInstallButton />
          {rightAction ? (
            rightAction
          ) : (
            <View style={styles.actionButtonsRow}>
              {/* Profile Icon Button */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/(family)/profile' as any)}
                style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]}
                accessibilityLabel="My Profile"
              >
                <Ionicons name="person-circle-outline" size={22} color={theme.primary} />
              </TouchableOpacity>

              {/* Logout Button with working handler */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleLogout}
                style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]}
                accessibilityLabel="Log out"
              >
                <Ionicons name="log-out-outline" size={19} color={theme.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    zIndex: 10,
    justifyContent: 'flex-end',
  },
  contentRow: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  brandHeaderSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  brandLogo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    marginRight: 10,
    backgroundColor: '#FFFFFF',
  },
  titleBox: {
    flex: 1,
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.1,
    lineHeight: 19,
  },
  brandSubtitle: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 1,
  },
  backHeaderSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backTitle: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
