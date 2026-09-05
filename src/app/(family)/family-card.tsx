import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/constants/theme';
import { familyService } from '@/features/family/familyService';
import { Family, FamilyMember } from '@/types/database';
import { DigitalFamilyCard } from '@/components/family/DigitalFamilyCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { TopBar } from '@/components/navigation/TopBar';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/AuthContext';

export default function FamilyCardScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();

  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setError('');
    if (!user?.id) {
      setFamily(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    const res = await familyService.getMyFamily(user.id);
    if (res.error) {
      setError(res.error);
    } else {
      setFamily(res.family);
      setMembers(res.members);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  if (loading) {
    return <LoadingState message="Generating digital family card..." />;
  }

  // If no family is set up yet, show clean EmptyState prompt instead of error
  if (!family) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <TopBar title="Digital Family Card" />
        <View style={styles.centerBody}>
          <EmptyState
            icon={<Text style={{ fontSize: 48, marginBottom: 8 }}>🪪</Text>}
            title="No Family Registered Yet"
            description="Please complete your family registration to generate your official digital family card and unique family code."
            actionTitle="+ Setup Family / પરિવાર નોંધણી કરો"
            onAction={() => router.push('/(family)/setup-family' as any)}
          />
        </View>
        <BottomTabBar />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TopBar title="Digital Family Card" />

      <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.content}>
        {/* Main Digital Family Card */}
        <DigitalFamilyCard
          family={family}
          members={members}
          onPressTree={() => router.push('/(family)/tree' as any)}
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
                <Text style={[styles.memberName, { color: theme.text }]}>{member.name}</Text>
                <Text style={[styles.memberRelation, { color: theme.primary }]}>
                  {member.display_relation || member.relation}
                </Text>
              </View>
              <View style={styles.memberMeta}>
                {member.age !== undefined ? (
                  <Badge label={`${member.age} yrs`} variant="neutral" size="sm" />
                ) : null}
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

      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  centerBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodyScroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
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
