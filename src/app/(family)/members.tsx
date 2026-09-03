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
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { TopBar } from '@/components/navigation/TopBar';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { Ionicons } from '@expo/vector-icons';

export default function FamilyMembersListScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'Male' | 'Female'>('ALL');

  const loadData = async () => {
    setError('');
    const res = await familyService.getMyFamily();
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
  }, []);

  if (loading) {
    return <LoadingState message="Loading family members..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const filtered = members.filter((m) => {
    if (genderFilter !== 'ALL' && m.gender !== genderFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.display_relation && m.display_relation.toLowerCase().includes(q)) ||
      (m.relation && m.relation.toLowerCase().includes(q)) ||
      (m.occupation_type && m.occupation_type.toLowerCase().includes(q)) ||
      (m.education_status && m.education_status.toLowerCase().includes(q))
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TopBar
        title="Family Members / સભ્યો"
        rightAction={
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(family)/add-member' as any)}
            style={[styles.addMemberBtn, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
            <Text style={styles.addMemberText}>+ Add</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.content}>
        {/* Search Input */}
        <Input
          placeholder="🔍 Search members by name, relation, education..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{ marginBottom: 12 }}
        />

        {/* Gender Filter Pills */}
        <View style={styles.filterRow}>
          {(['ALL', 'Male', 'Female'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              activeOpacity={0.7}
              onPress={() => setGenderFilter(filter)}
              style={[
                styles.filterPill,
                {
                  backgroundColor: genderFilter === filter ? theme.primary : theme.backgroundElement,
                  borderColor: genderFilter === filter ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: genderFilter === filter ? '#FFFFFF' : theme.text },
                ]}
              >
                {filter === 'ALL' ? `All (${members.length})` : filter === 'Male' ? 'Male / પુરુષ' : 'Female / સ્ત્રી'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Member Cards List */}
        {filtered.length === 0 ? (
          <EmptyState
            title="No Members Found"
            description="Try changing your search query or filter."
          />
        ) : (
          filtered.map((member) => (
            <TouchableOpacity
              key={member.id}
              activeOpacity={0.75}
              onPress={() => router.push(`/(family)/member/${member.id}` as any)}
            >
              <Card style={styles.memberCard}>
                <View style={styles.memberCardRow}>
                  <Avatar
                    name={member.name}
                    photoUrl={member.photo_url}
                    gender={member.gender}
                    size={48}
                  />

                  <View style={styles.memberCardInfo}>
                    <Text style={[styles.memberName, { color: theme.text }]}>
                      {member.name}
                    </Text>
                    <Text style={[styles.memberRelation, { color: theme.primary }]}>
                      {member.display_relation || member.relation}
                    </Text>

                    <View style={styles.badgeRow}>
                      <Badge label={member.gender} variant="neutral" size="sm" />
                      {member.age !== undefined ? (
                        <Badge
                          label={`${member.age} yrs`}
                          variant="primary"
                          size="sm"
                          style={{ marginLeft: 6 }}
                        />
                      ) : null}
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bodyScroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 24,
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addMemberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  memberCard: {
    padding: 12,
    marginBottom: 10,
  },
  memberCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberCardInfo: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
  },
  memberRelation: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
});
