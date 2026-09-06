import React, { useState } from 'react';
import {
  RefreshControl,
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
import { EditFamilyAddressModal } from '@/components/family/EditFamilyAddressModal';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { formatAgeShort } from '@/lib/utils/date';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Ionicons } from '@expo/vector-icons';

export interface HomeTabViewProps {
  family: Family | null;
  members: FamilyMember[];
  refreshing: boolean;
  onRefresh: () => void;
  onNavigateTab: (tabId: 'home' | 'members' | 'tree' | 'card') => void;
}

export function HomeTabView({
  family,
  members,
  refreshing,
  onRefresh,
  onNavigateTab,
}: HomeTabViewProps) {
  const router = useRouter();
  const theme = useTheme();

  if (!family) {
    return (
      <View style={styles.onboardingContainer}>
        <Card style={styles.onboardingCard}>
          <Text style={styles.onboardingEmoji}>{'👨‍👩‍👧‍👦'}</Text>
          <Text style={[styles.onboardingTitle, { color: theme.text }]}>
            Welcome to અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા!
          </Text>
          <Text style={[styles.onboardingDesc, { color: theme.textSecondary }]}>
            તમારા પરિવારની ડિજિટલ પુસ્તિકા નોંધણી કરો અને ઇન્ટરેક્ટિવ ફેમિલી ટ્રી બનાવો.
          </Text>
          <Button
            title="Setup Family / પરિવાર નોંધણી કરો"
            onPress={() => router.push('/(family)/setup-family' as any)}
            size="lg"
            style={{ marginTop: 20 }}
          />
        </Card>
      </View>
    );
  }

  const headMember = members.find((m) => m.relation === 'FAMILY_HEAD') || members[0];
  const [addressModalVisible, setAddressModalVisible] = useState(false);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
      }
    >
      {/* Welcome Greeting */}
      <View style={styles.welcomeBanner}>
        <Text style={[styles.welcomeGreeting, { color: theme.textSecondary }]}>
          Welcome back / સ્વાગત છે,
        </Text>
        <Text style={[styles.welcomeName, { color: theme.text }]}>
          {headMember ? headMember.name : 'Family Head'}
        </Text>
      </View>

      {/* Digital Family Card */}
      <DigitalFamilyCard
        family={family}
        members={members}
        onPressDetails={() => onNavigateTab('card')}
        onPressTree={() => onNavigateTab('tree')}
        onPressAddMember={() => router.push('/(family)/add-member' as any)}
        onPressEditAddress={() => setAddressModalVisible(true)}
      />

      {/* Quick Action Grid */}
      <View style={styles.actionGrid}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/(family)/add-member' as any)}
          style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="person-add" size={20} color={theme.primary} />
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.actionTitle, { color: theme.text }]}>Add Member</Text>
          <Text numberOfLines={1} style={[styles.actionSubtitle, { color: theme.textSecondary }]}>સભ્ય ઉમેરો</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onNavigateTab('tree')}
          style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="git-network" size={20} color="#16A34A" />
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.actionTitle, { color: theme.text }]}>Family Tree</Text>
          <Text numberOfLines={1} style={[styles.actionSubtitle, { color: theme.textSecondary }]}>ફેમિલી ટ્રી</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setAddressModalVisible(true)}
          style={[styles.actionCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="home" size={20} color="#D97706" />
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.actionTitle, { color: theme.text }]}>Edit Address</Text>
          <Text numberOfLines={1} style={[styles.actionSubtitle, { color: theme.textSecondary }]}>સરનામું બદલો</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Family Address Modal */}
      <EditFamilyAddressModal
        visible={addressModalVisible}
        family={family}
        onClose={() => setAddressModalVisible(false)}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />

      {/* Recent Directory Strip */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Family Directory ({members.length})
        </Text>
        <TouchableOpacity onPress={() => onNavigateTab('members')}>
          <Text style={[styles.viewAllText, { color: theme.primary }]}>View All →</Text>
        </TouchableOpacity>
      </View>

      {members.map((member) => (
        <TouchableOpacity
          key={member.id}
          activeOpacity={0.7}
          onPress={() => router.push(`/(family)/member/${member.id}` as any)}
        >
          <Card style={styles.memberCard}>
            <View style={styles.memberCardRow}>
              <Avatar
                name={member.name}
                photoUrl={member.photo_url}
                gender={member.gender}
                size={46}
                enablePreview={true}
                subtitle={member.display_relation || member.relation}
              />
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: theme.text }]}>
                  {member.is_deceased ? `🕊️ સ્વ. ${member.name}` : member.name}
                </Text>
                <Text style={[styles.memberRelation, { color: theme.primary }]}>
                  {member.display_relation || member.relation}
                </Text>
                <View style={styles.badgeRow}>
                  <Badge label={member.gender} variant="neutral" size="sm" />
                  {member.is_deceased ? (
                    <Badge
                      label="🕊️ સ્વર્ગસ્થ"
                      variant="neutral"
                      size="sm"
                      style={{ marginLeft: 6 }}
                    />
                  ) : (
                    member.dob || member.age !== undefined ? (
                      <Badge
                        label={formatAgeShort(member.dob, member.age)}
                        variant="primary"
                        size="sm"
                        style={{ marginLeft: 6 }}
                      />
                    ) : null
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </View>
          </Card>
        </TouchableOpacity>
      ))}
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
  onboardingContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  onboardingCard: {
    padding: 24,
    alignItems: 'center',
  },
  onboardingEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  onboardingTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  onboardingDesc: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },
  welcomeBanner: {
    marginBottom: 8,
  },
  welcomeGreeting: {
    fontSize: 13,
    fontWeight: '500',
  },
  welcomeName: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  actionCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 10.5,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  memberCard: {
    padding: 12,
    marginBottom: 8,
  },
  memberCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
  },
  memberRelation: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
});
