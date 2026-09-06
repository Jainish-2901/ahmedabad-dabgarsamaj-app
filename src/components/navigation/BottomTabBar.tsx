import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export type TabId = 'home' | 'members' | 'booklet' | 'tree' | 'card';

interface TabItem {
  id: TabId;
  route: string;
  label: string;
  gujaratiLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabItem[] = [
  {
    id: 'home',
    route: '/(family)/home',
    label: 'Home',
    gujaratiLabel: 'હોમ',
    icon: 'home-outline',
    activeIcon: 'home',
  },
  {
    id: 'members',
    route: '/(family)/members',
    label: 'Members',
    gujaratiLabel: 'સભ્યો',
    icon: 'people-outline',
    activeIcon: 'people',
  },
  {
    id: 'booklet',
    route: '/(family)/booklet',
    label: 'Booklet',
    gujaratiLabel: 'પુસ્તિકા',
    icon: 'book-outline',
    activeIcon: 'book',
  },
  {
    id: 'tree',
    route: '/(family)/tree',
    label: 'Tree',
    gujaratiLabel: 'ટ્રી',
    icon: 'git-network-outline',
    activeIcon: 'git-network',
  },
  {
    id: 'card',
    route: '/(family)/family-card',
    label: 'Card',
    gujaratiLabel: 'કાર્ડ',
    icon: 'card-outline',
    activeIcon: 'card',
  },
];

export interface BottomTabBarProps {
  activeTab?: TabId;
  onSelectTab?: (tabId: TabId) => void;
}

export function BottomTabBar({ activeTab, onSelectTab }: BottomTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const safeBottom = Math.max(insets.bottom, 8);

  const handleTabPress = (tab: TabItem) => {
    if (onSelectTab) {
      onSelectTab(tab.id);
    } else {
      router.replace(tab.route as any);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          paddingBottom: safeBottom,
          height: 56 + safeBottom,
        },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = activeTab
          ? activeTab === tab.id
          : pathname.includes(tab.id) ||
            (tab.id === 'home' && (pathname === '/' || pathname === '/(family)/home'));

        return (
          <TouchableOpacity
            key={tab.id}
            activeOpacity={0.7}
            onPress={() => handleTabPress(tab)}
            style={styles.tabButton}
          >
            <Ionicons
              name={isActive ? tab.activeIcon : tab.icon}
              size={22}
              color={isActive ? theme.primary : theme.textSecondary}
            />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isActive ? theme.primary : theme.textSecondary,
                  fontWeight: isActive ? '700' : '500',
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 6,
    elevation: 8,
    boxShadow: '0px -2px 6px rgba(0, 0, 0, 0.05)',
  },
  tabButton: {
    flex: 1,
    maxWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});
