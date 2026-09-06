import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/constants/theme';
import { TopBar } from '@/components/navigation/TopBar';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { BookletTabView } from '@/components/family/tabs/BookletTabView';

export default function BookletScreen() {
  const theme = useTheme();
  const { q, code } = useLocalSearchParams<{ q?: string; code?: string }>();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TopBar title="અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા" />

      <View style={styles.content}>
        <BookletTabView initialQuery={q || code} />
      </View>

      <BottomTabBar activeTab="booklet" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
