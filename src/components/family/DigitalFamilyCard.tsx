import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewProps,
  useColorScheme,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { Family, FamilyMember } from '@/types/database';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Ionicons } from '@expo/vector-icons';

export interface DigitalFamilyCardProps extends ViewProps {
  family: Family;
  members: FamilyMember[];
  onPressTree?: () => void;
  onPressDetails?: () => void;
  onPressAddMember?: () => void;
}

export function DigitalFamilyCard({
  family,
  members,
  onPressTree,
  onPressDetails,
  onPressAddMember,
  style,
  ...props
}: DigitalFamilyCardProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const headMember = members.find((m) => m.relation === 'FAMILY_HEAD') || members[0];
  const areaName = family.area?.name || (typeof family.area_id === 'string' ? family.area_id : family.city);

  const maleCount = members.filter((m) => m.gender === 'Male').length;
  const femaleCount = members.filter((m) => m.gender === 'Female').length;
  const childrenCount = members.filter((m) => m.age !== undefined && m.age < 18).length;

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
        style,
      ]}
      {...props}
    >
      {/* Top Banner */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.communityTitle}>અમદાવાદ ડબગર સમાજ ડિજિટલ પરિચય પુસ્તિકા</Text>
          <Text style={styles.familyCode}>{family.family_code}</Text>
        </View>
        <Badge
          label={family.status === 'ACTIVE' ? 'Active / સક્રિય' : 'Archived'}
          variant="success"
          size="sm"
        />
      </View>

      {/* Main Family Info */}
      <View style={styles.body}>
        {/* Head details row */}
        <View style={styles.headSection}>
          <Avatar
            name={headMember ? headMember.name : 'Head'}
            photoUrl={headMember?.photo_url}
            gender={headMember?.gender}
            size={56}
            enablePreview={true}
            subtitle="Family Head / પરિવારના વડા"
          />
          <View style={styles.headInfo}>
            <Text style={[styles.headLabel, { color: theme.textSecondary }]}>
              Family Head / પરિવાર વડા:
            </Text>
            <Text style={[styles.headName, { color: theme.text }]}>
              {headMember ? headMember.name : 'Not set'}
            </Text>
            {headMember?.mobile ? (
              <Text style={[styles.contactText, { color: theme.primary }]}>
                📞 {headMember.mobile}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Address Row */}
        <View style={[styles.addressBox, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="location-outline" size={18} color={theme.primary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.addressText, { color: theme.text }]}>
              {family.address}
            </Text>
            <Text style={[styles.areaCityText, { color: theme.textSecondary }]}>
              {areaName ? `${areaName}, ` : ''}{family.city}, {family.state} - {family.pincode}
            </Text>
          </View>
        </View>

        {/* Demographic Statistics Pills */}
        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.statValue, { color: theme.primary }]}>{members.length}</Text>
            <Text style={[styles.statLabel, { color: theme.primary }]}>Total Members</Text>
          </View>

          <View style={[styles.statPill, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.statValue, { color: '#2563EB' }]}>{maleCount}</Text>
            <Text style={[styles.statLabel, { color: '#2563EB' }]}>Male / પુરુષ</Text>
          </View>

          <View style={[styles.statPill, { backgroundColor: '#FDF2F8' }]}>
            <Text style={[styles.statValue, { color: '#DB2777' }]}>{femaleCount}</Text>
            <Text style={[styles.statLabel, { color: '#DB2777' }]}>Female / સ્ત્રી</Text>
          </View>

          <View style={[styles.statPill, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.statValue, { color: '#D97706' }]}>{childrenCount}</Text>
            <Text style={[styles.statLabel, { color: '#D97706' }]}>Children (&lt;18)</Text>
          </View>
        </View>

        {/* Member Thumbnails Strip */}
        <View style={styles.thumbnailsSection}>
          <View style={styles.membersSectionHeader}>
            <Text style={[styles.thumbnailSectionLabel, { color: theme.textSecondary }]}>
              Family Members ({members.length}):
            </Text>
            {onPressAddMember ? (
              <TouchableOpacity onPress={onPressAddMember}>
                <Text style={[styles.addMemberLink, { color: theme.primary }]}>+ Add</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.thumbnailsGrid}>
            {members.map((member) => (
              <View key={member.id} style={styles.memberChip}>
                <Avatar
                  name={member.name}
                  photoUrl={member.photo_url}
                  size={34}
                  gender={member.gender}
                />
                <View style={styles.memberChipText}>
                  <Text numberOfLines={1} style={[styles.chipName, { color: theme.text }]}>
                    {member.name.split(' ')[0]}
                  </Text>
                  <Text numberOfLines={1} style={[styles.chipRelation, { color: theme.textSecondary }]}>
                    {member.display_relation?.split('/')[0].trim() || member.relation}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Footer Actions */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        {onPressDetails ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPressDetails}
            style={styles.footerAction}
          >
            <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.actionText, { color: theme.textSecondary, marginLeft: 4 }]}>
              All Details
            </Text>
          </TouchableOpacity>
        ) : null}

        {onPressTree ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPressTree}
            style={[styles.footerActionBold, { backgroundColor: theme.primaryLight, marginLeft: 'auto' }]}
          >
            <Ionicons name="git-network" size={16} color={theme.primary} />
            <Text style={[styles.actionTextBold, { color: theme.primary, marginLeft: 6 }]}>
              View Tree / ફેમિલી ટ્રી →
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginVertical: 10,
    elevation: 4,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flex: 1,
  },
  communityTitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  familyCode: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 2,
  },
  body: {
    padding: 16,
  },
  headSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  headInfo: {
    marginLeft: 14,
    flex: 1,
  },
  headLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  headName: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  contactText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  areaCityText: {
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  statPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  thumbnailsSection: {
    marginTop: 4,
  },
  membersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  thumbnailSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  addMemberLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  thumbnailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    paddingRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  memberChipText: {
    marginLeft: 6,
  },
  chipName: {
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 75,
  },
  chipRelation: {
    fontSize: 10,
    maxWidth: 75,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  footerActionBold: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionTextBold: {
    fontSize: 13,
    fontWeight: '700',
  },
});
