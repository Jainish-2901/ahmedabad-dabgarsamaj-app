import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/constants/theme';
import { Family, FamilyMember } from '@/types/database';
import { DigitalFamilyCard } from '@/components/family/DigitalFamilyCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { formatAgeShort } from '@/lib/utils/date';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Ionicons } from '@expo/vector-icons';

export interface CardTabViewProps {
  family: Family | null;
  members: FamilyMember[];
  onNavigateTab: (tabId: 'home' | 'members' | 'tree' | 'card') => void;
}

export function CardTabView({ family, members, onNavigateTab }: CardTabViewProps) {
  const router = useRouter();
  const theme = useTheme();

  if (!family) {
    return (
      <View style={styles.centerContainer}>
        <EmptyState
          icon={<Text style={{ fontSize: 48, marginBottom: 8 }}>🪪</Text>}
          title="No Family Registered Yet"
          description="Please complete your family registration to generate your official digital family card and unique family code."
          actionTitle="+ Setup Family / પરિવાર નોંધણી કરો"
          onAction={() => router.push('/(family)/setup-family' as any)}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Main Digital Family Card */}
      <DigitalFamilyCard
        family={family}
        members={members}
        onPressTree={() => onNavigateTab('tree')}
        onPressAddMember={() => router.push('/(family)/add-member' as any)}
      />

      {/* Complete Members Directory Breakdown Card */}
      <Card style={styles.detailsCard}>
        <Text style={[styles.sectionHeading, { color: theme.text }]}>
          All Family Members / સર્વ સભ્યો
        </Text>

        {members.map((member) => (
          <TouchableOpacity
            key={member.id}
            activeOpacity={0.7}
            onPress={() => router.push(`/(family)/member/${member.id}` as any)}
            style={[styles.memberItem, { borderBottomColor: theme.border }]}
          >
            <Avatar
              name={member.name}
              photoUrl={member.photo_url}
              gender={member.gender}
              size={40}
            />
            <View style={styles.memberInfo}>
              <Text style={[styles.memberName, { color: theme.text }]}>
                {member.is_deceased ? `🕊️ સ્વ. ${member.name}` : member.name}
              </Text>
              <Text style={[styles.memberRelation, { color: theme.primary }]}>
                {member.display_relation || member.relation}
              </Text>
            </View>
            <View style={styles.memberMeta}>
              {member.is_deceased ? (
                <Badge label="🕊️ સ્વર્ગસ્થ" variant="neutral" size="sm" />
              ) : (
                member.dob || member.age !== undefined ? (
                  <Badge label={formatAgeShort(member.dob, member.age)} variant="neutral" size="sm" />
                ) : null
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        ))}
      </Card>

      {/* Verification & ID Info */}
      <Card style={styles.verifyCard}>
        <View style={styles.verifyRow}>
          <Ionicons name="shield-checkmark" size={24} color="#16A34A" />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={[styles.verifyTitle, { color: theme.text }]}>
              Official Community Census Record
            </Text>
            <Text style={[styles.verifySubtitle, { color: theme.textSecondary }]}>
              Verified and securely stored in the Community Family Directory system.
            </Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsCard: {
    padding: 16,
    marginTop: 14,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
  },
  memberRelation: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyCard: {
    padding: 14,
    marginTop: 14,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  verifySubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
