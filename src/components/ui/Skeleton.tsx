import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/constants/theme';
import { Card } from './Card';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 6,
  style,
}: SkeletonProps) {
  const theme = useTheme();
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.backgroundElement || '#E2E8F0',
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton card matching the exact structure of BookletCard
 */
export function BookletCardSkeleton() {
  const theme = useTheme();

  return (
    <Card style={styles.card}>
      {/* Top Banner Bar Skeleton */}
      <View style={[styles.headerBanner, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.row}>
          <Skeleton width={80} height={20} borderRadius={6} />
          <Skeleton width={110} height={16} borderRadius={4} />
        </View>
        <Skeleton width={45} height={16} borderRadius={10} />
      </View>

      {/* Head Profile Section Skeleton */}
      <View style={styles.headSection}>
        <Skeleton width={56} height={56} borderRadius={28} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="65%" height={18} borderRadius={4} />
          <Skeleton width="45%" height={14} borderRadius={4} />
          <Skeleton width="85%" height={12} borderRadius={4} />
        </View>
      </View>

      {/* Members Section Skeleton */}
      <View style={styles.membersSection}>
        <Skeleton width="40%" height={14} borderRadius={4} style={{ marginBottom: 10 }} />
        {[1, 2, 3].map((key) => (
          <View key={key} style={[styles.memberRow, { borderColor: theme.border }]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Skeleton width="55%" height={14} borderRadius={4} />
              <Skeleton width="35%" height={12} borderRadius={4} />
            </View>
            <Skeleton width={70} height={20} borderRadius={6} />
          </View>
        ))}
      </View>

      {/* Footer Button Skeleton */}
      <View style={[styles.footerRow, { borderColor: theme.border }]}>
        <Skeleton width="60%" height={16} borderRadius={4} />
        <Skeleton width={45} height={26} borderRadius={6} />
      </View>
    </Card>
  );
}

/**
 * Full Booklet Tab Loading Skeleton Screen
 */
export function BookletScreenSkeleton() {
  const theme = useTheme();

  return (
    <View style={styles.screenContainer}>
      {/* Top Stats Banner Skeleton */}
      <Card style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statsItem}>
            <Skeleton width={40} height={20} borderRadius={4} />
            <Skeleton width={60} height={10} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
          <View style={styles.statsItem}>
            <Skeleton width={40} height={20} borderRadius={4} />
            <Skeleton width={60} height={10} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
          <View style={styles.statsItem}>
            <Skeleton width={40} height={20} borderRadius={4} />
            <Skeleton width={60} height={10} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        </View>
      </Card>

      {/* Action Buttons Skeleton */}
      <View style={styles.actionRow}>
        <Skeleton width="62%" height={38} borderRadius={10} />
        <Skeleton width="35%" height={38} borderRadius={10} />
      </View>

      {/* 2 Family Cards Skeleton */}
      <BookletCardSkeleton />
      <BookletCardSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  headerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headSection: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    alignItems: 'center',
  },
  membersSection: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  screenContainer: {
    padding: 16,
  },
  statsCard: {
    padding: 14,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statsItem: {
    alignItems: 'center',
    gap: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
});
