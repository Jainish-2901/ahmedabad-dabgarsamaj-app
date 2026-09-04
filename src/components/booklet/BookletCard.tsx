import React from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/constants/theme';
import { CommunityFamilyBookletItem } from '@/features/directory/directoryService';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { exportFamilyAsPdf } from '@/lib/utils/exportPdf';
import { Ionicons } from '@expo/vector-icons';
import { matchesMemberQuery, getMemberMatchHighlight } from '@/features/directory/directoryService';
import { router } from 'expo-router';

export interface BookletCardProps {
  item: CommunityFamilyBookletItem;
  searchQuery?: string;
  onPressDetails?: () => void;
}

export function BookletCard({ item, searchQuery = '', onPressDetails }: BookletCardProps) {
  const theme = useTheme();
  const { family, headMember, members } = item;

  const handleCall = (phone?: string | null) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (cleanPhone) {
      Linking.openURL(`tel:${cleanPhone}`);
    }
  };

  const areaText = family.area?.name || family.city || 'Gujarat';

  // Check matched members if searchQuery is present
  const trimmedQuery = searchQuery.trim();
  const hasSearch = trimmedQuery.length > 0;
  
  const isHeadMatched = headMember ? matchesMemberQuery(headMember, trimmedQuery) : false;
  const headMatchBadge = isHeadMatched && headMember ? getMemberMatchHighlight(headMember, trimmedQuery) : null;

  // Filter other non-head members that matched
  const matchedNonHeadMembers = hasSearch
    ? members.filter((m) => m.id !== headMember?.id && matchesMemberQuery(m, trimmedQuery))
    : [];

  const handleOpenMember = (memberId: string) => {
    router.push({
      pathname: '/(family)/member/[id]',
      params: { id: memberId },
    });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPressDetails}
      style={[
        styles.bookCard,
        {
          backgroundColor: theme.card,
          borderColor: hasSearch && (isHeadMatched || matchedNonHeadMembers.length > 0) ? theme.primary : theme.border,
        },
      ]}
    >
      {/* Booklet Header Bar */}
      <View style={[styles.headerBanner, { backgroundColor: theme.primaryLight }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.codeBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.codeText}>{family.family_code}</Text>
          </View>
          <Text style={[styles.areaBadgeText, { color: theme.primary }]}>
            📍 {areaText}
          </Text>
        </View>

        <View style={styles.membersCountPill}>
          <Ionicons name="people" size={13} color={theme.textSecondary} />
          <Text style={[styles.membersCountText, { color: theme.textSecondary }]}>
            {members.length} {members.length === 1 ? 'સભ્ય' : 'સભ્યો'}
          </Text>
        </View>
      </View>

      {/* Head of Family Main Section */}
      <View style={styles.headSection}>
        <Avatar
          name={headMember ? headMember.name : 'Head'}
          photoUrl={headMember?.photo_url}
          gender={headMember?.gender}
          size={56}
          enablePreview={true}
          subtitle="Family Head / પરિવારના વડા"
        />

        <View style={styles.headDetails}>
          <View style={styles.headTitleRow}>
            <Text style={[styles.headName, { color: theme.text }]} numberOfLines={1}>
              {headMember ? headMember.name : 'Family Head'}
            </Text>
            <Badge label="વડા" variant="primary" size="sm" />
          </View>

          {/* If Head matched search query directly, show match highlight badge */}
          {headMatchBadge ? (
            <View style={[styles.matchBadge, { backgroundColor: '#FEF2F2', borderColor: '#F87171' }]}>
              <Text style={[styles.matchBadgeText, { color: '#DC2626' }]}>
                {headMatchBadge}
              </Text>
            </View>
          ) : null}

          {/* Clickable Mobile */}
          {headMember?.mobile ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleCall(headMember.mobile)}
              style={styles.mobileRow}
            >
              <Ionicons name="call" size={13} color={theme.primary} />
              <Text style={[styles.mobileText, { color: theme.primary }]}>
                {headMember.mobile}
              </Text>
              <Text style={[styles.callHint, { color: theme.textSecondary }]}>
                (Tap to Call)
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Address */}
          {family.address ? (
            <View style={styles.addressRow}>
              <Ionicons name="home-outline" size={12} color={theme.textSecondary} style={{ marginTop: 2 }} />
              <Text style={[styles.addressText, { color: theme.textSecondary }]} numberOfLines={2}>
                {family.address}, {family.city} - {family.pincode}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* If Search is Active and Non-Head Members Matched: Show matched members with head */}
      {hasSearch && matchedNonHeadMembers.length > 0 ? (
        <View style={[styles.matchedSection, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }]}>
          <View style={styles.matchedSectionHeader}>
            <Ionicons name="search" size={12} color={theme.primary} />
            <Text style={[styles.matchedSectionTitle, { color: theme.primary }]}>
              મેળ ખાતા પરિવારના સભ્યો ({matchedNonHeadMembers.length}):
            </Text>
          </View>

          <View style={styles.matchedList}>
            {matchedNonHeadMembers.map((m) => {
              const matchBadge = getMemberMatchHighlight(m, trimmedQuery);
              return (
                <TouchableOpacity
                  key={m.id}
                  activeOpacity={0.75}
                  onPress={() => handleOpenMember(m.id)}
                  style={[styles.matchedMemberRow, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <Avatar
                    name={m.name}
                    photoUrl={m.photo_url}
                    gender={m.gender}
                    size={36}
                    enablePreview={false}
                  />

                  <View style={styles.matchedMemberInfo}>
                    <View style={styles.matchedMemberTopRow}>
                      <Text style={[styles.matchedMemberName, { color: theme.text }]} numberOfLines={1}>
                        {m.name}
                      </Text>
                      <Text style={[styles.matchedMemberRelation, { color: theme.textSecondary }]}>
                        {m.display_relation || m.relation}
                      </Text>
                    </View>

                    <View style={styles.matchedMemberMetaRow}>
                      {matchBadge ? (
                        <View style={[styles.matchBadge, { backgroundColor: '#FEF2F2', borderColor: '#F87171' }]}>
                          <Text style={[styles.matchBadgeText, { color: '#DC2626' }]}>
                            {matchBadge}
                          </Text>
                        </View>
                      ) : null}

                      {m.blood_group && matchBadge && !matchBadge.includes('બ્લડ') ? (
                        <View style={[styles.miniBadge, { backgroundColor: theme.primaryLight }]}>
                          <Text style={[styles.miniBadgeText, { color: theme.primary }]}>
                            🩸 {m.blood_group}
                          </Text>
                        </View>
                      ) : null}

                      {m.mobile ? (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleCall(m.mobile)}
                          style={styles.matchedCallBtn}
                        >
                          <Ionicons name="call" size={11} color={theme.primary} />
                          <Text style={[styles.matchedCallText, { color: theme.primary }]}>
                            {m.mobile}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Booklet Card Footer Button */}
      <View style={[styles.footerRow, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }]}>
        {onPressDetails ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPressDetails}
            style={styles.footerMainBtn}
          >
            <Text style={[styles.footerBtnText, { color: theme.primary }]}>
              સંપૂર્ણ વિગતો જુઓ / View Details
            </Text>
            <Ionicons name="chevron-forward" size={15} color={theme.primary} />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => exportFamilyAsPdf(family, members)}
          style={[styles.quickPdfBtn, { backgroundColor: theme.card, borderColor: theme.primary }]}
        >
          <Ionicons name="document-text-outline" size={14} color={theme.primary} />
          <Text style={[styles.quickPdfText, { color: theme.primary }]}>PDF</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bookCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  areaBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  membersCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  membersCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headSection: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  headDetails: {
    flex: 1,
  },
  headTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  headName: {
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
  },
  mobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  mobileText: {
    fontSize: 13,
    fontWeight: '700',
  },
  callHint: {
    fontSize: 11,
    marginLeft: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 2,
  },
  addressText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  footerMainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickPdfText: {
    fontSize: 11,
    fontWeight: '800',
  },
  matchBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 2,
    marginBottom: 4,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  matchedSection: {
    padding: 12,
    borderTopWidth: 1,
  },
  matchedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  matchedSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  matchedList: {
    gap: 8,
  },
  matchedMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  matchedMemberInfo: {
    flex: 1,
  },
  matchedMemberTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  matchedMemberName: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  matchedMemberRelation: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },
  matchedMemberMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  matchedCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  matchedCallText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
