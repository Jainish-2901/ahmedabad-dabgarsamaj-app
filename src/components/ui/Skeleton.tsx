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
 * Skeleton card matching the exact structure of compact BookletCard
 */
export function BookletCardSkeleton() {
  const theme = useTheme();

  return (
    <Card style={styles.card}>
      {/* Top Banner Bar Skeleton */}
      <View style={[styles.headerBanner, { backgroundColor: theme.primaryLight }]}>
        <View style={styles.headerLeft}>
          <Skeleton width={70} height={20} borderRadius={6} />
          <Skeleton width={80} height={16} borderRadius={4} />
        </View>
        <Skeleton width={52} height={16} borderRadius={10} />
      </View>

      {/* Head Profile Section Skeleton */}
      <View style={styles.headSection}>
        <Skeleton width={56} height={56} borderRadius={28} />
        <View style={styles.headDetails}>
          <View style={styles.headTitleRow}>
            <Skeleton width="55%" height={17} borderRadius={4} />
            <Skeleton width={34} height={18} borderRadius={6} />
          </View>
          <View style={styles.infoRow}>
            <Skeleton width={14} height={14} borderRadius={7} />
            <Skeleton width="45%" height={14} borderRadius={4} />
          </View>
          <View style={styles.infoRow}>
            <Skeleton width={14} height={14} borderRadius={3} />
            <Skeleton width="75%" height={12} borderRadius={4} />
          </View>
        </View>
      </View>

      {/* Footer Button Skeleton */}
      <View style={[styles.footerRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        <Skeleton width="52%" height={16} borderRadius={4} />
        <Skeleton width={50} height={26} borderRadius={8} />
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
            <Skeleton width={44} height={22} borderRadius={4} />
            <Skeleton width={65} height={10} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
          <View style={[styles.statsDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statsItem}>
            <Skeleton width={44} height={22} borderRadius={4} />
            <Skeleton width={70} height={10} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
          <View style={[styles.statsDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statsItem}>
            <Skeleton width={44} height={22} borderRadius={4} />
            <Skeleton width={65} height={10} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        </View>
      </Card>

      {/* Action Buttons Skeleton */}
      <View style={styles.actionRow}>
        <Skeleton width="60%" height={38} borderRadius={10} />
        <Skeleton width="37%" height={38} borderRadius={10} />
      </View>

      {/* Compact Family Cards Skeleton */}
      <BookletCardSkeleton />
      <BookletCardSkeleton />
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headSection: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  headDetails: {
    flex: 1,
    gap: 6,
  },
  headTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  screenContainer: {
    padding: 16,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  statsCard: {
    padding: 12,
    marginBottom: 16,
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statsItem: {
    alignItems: 'center',
    flex: 1,
  },
  statsDivider: {
    width: 1,
    height: 28,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
});
