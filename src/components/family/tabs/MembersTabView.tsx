import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/constants/theme';
import { FamilyMember } from '@/types/database';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { formatAgeShort } from '@/lib/utils/date';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Ionicons } from '@expo/vector-icons';

export interface MembersTabViewProps {
  members: FamilyMember[];
}

export function MembersTabView({ members }: MembersTabViewProps) {
  const router = useRouter();
  const theme = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'Male' | 'Female'>('ALL');

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Search and Add row */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput
            placeholder="Search by name, relation, education..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => router.push('/(family)/add-member' as any)}
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
        >
          <Ionicons name="person-add" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

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
          description="Try changing your search query or gender filter."
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
                  enablePreview={true}
                  subtitle={member.display_relation || member.relation}
                />

                <View style={styles.memberCardInfo}>
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

                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </View>
            </Card>
          </TouchableOpacity>
        ))
      )}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    width: '100%',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    paddingVertical: 0,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
