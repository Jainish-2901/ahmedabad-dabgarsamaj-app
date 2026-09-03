import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/constants/theme';
import { TopBar } from '@/components/navigation/TopBar';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { BookletTabView } from '@/components/family/tabs/BookletTabView';

export default function BookletScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TopBar title="અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા" />

      <View style={styles.content}>
        <BookletTabView />
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
