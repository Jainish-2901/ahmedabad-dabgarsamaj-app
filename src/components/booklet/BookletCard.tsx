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
import { formatAgeShort } from '@/lib/utils/date';
import { getOccupationDisplay } from '@/constants/occupations';
import { exportFamilyAsPdf } from '@/lib/utils/exportPdf';
import { Ionicons } from '@expo/vector-icons';

export interface BookletCardProps {
  item: CommunityFamilyBookletItem;
  onPressDetails?: () => void;
}

export function BookletCard({ item, onPressDetails }: BookletCardProps) {
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

  return (
    <View style={[styles.bookCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
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

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* Members Directory Mini-Table */}
      <View style={styles.membersTable}>
        <Text style={[styles.tableSectionTitle, { color: theme.textSecondary }]}>
          પરિવારના સભ્યો / Family Members:
        </Text>

        {members.map((m, index) => {
          const occDisplay = getOccupationDisplay(m.occupation_type);
          const eduDisplay = m.education_status;

          return (
            <View
              key={m.id || index}
              style={[
                styles.memberRow,
                index < members.length - 1 ? { borderBottomColor: theme.border, borderBottomWidth: 1 } : null,
              ]}
            >
              {/* Name & Relation */}
              <View style={styles.memberNameCol}>
                <Text style={[styles.memberNameText, { color: theme.text }]} numberOfLines={1}>
                  {m.is_deceased ? `🕊️ સ્વ. ${m.name}` : m.name}
                </Text>
                <Text style={[styles.memberRelationText, { color: theme.textSecondary }]}>
                  {m.display_relation || m.relation} • {m.is_deceased ? '🕊️ સ્વર્ગસ્થ' : formatAgeShort(m.dob, m.age)}
                </Text>
              </View>

              {/* Tags for Edu & Occupation */}
              <View style={styles.memberTagsCol}>
                {eduDisplay ? (
                  <View style={[styles.miniTag, { backgroundColor: theme.backgroundElement }]}>
                    <Text style={[styles.miniTagText, { color: theme.text }]} numberOfLines={1}>
                      🎓 {eduDisplay}
                    </Text>
                  </View>
                ) : null}

                {occDisplay ? (
                  <View style={[styles.miniTag, { backgroundColor: theme.primaryLight }]}>
                    <Text style={[styles.miniTagText, { color: theme.primary }]} numberOfLines={1}>
                      💼 {occDisplay}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {/* Booklet Card Footer Button */}
      <View style={[styles.footerRow, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }]}>
        {onPressDetails ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPressDetails}
            style={styles.footerMainBtn}
          >
            <Text style={[styles.footerBtnText, { color: theme.primary }]}>
              સંપૂર્ણ પરિચય પુસ્તિકા પેજ / Details
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
    </View>
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
  divider: {
    height: 1,
    marginHorizontal: 14,
  },
  membersTable: {
    padding: 14,
    paddingTop: 10,
  },
  tableSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  memberNameCol: {
    flex: 1,
  },
  memberNameText: {
    fontSize: 13,
    fontWeight: '700',
  },
  memberRelationText: {
    fontSize: 11,
    marginTop: 1,
  },
  memberTagsCol: {
    alignItems: 'flex-end',
    gap: 4,
    maxWidth: '48%',
  },
  miniTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: '100%',
  },
  miniTagText: {
    fontSize: 10,
    fontWeight: '600',
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
});
