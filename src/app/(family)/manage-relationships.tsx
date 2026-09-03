import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/constants/theme';
import { familyService } from '@/features/family/familyService';
import { relationshipsService } from '@/features/tree/relationshipsService';
import { DirectRelationshipType, Family, FamilyMember, FamilyRelationship } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { TopBar } from '@/components/navigation/TopBar';

export default function ManageRelationshipsScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [relationships, setRelationships] = useState<FamilyRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // New Link Form State
  const [fromMemberId, setFromMemberId] = useState<string>('');
  const [toMemberId, setToMemberId] = useState<string>('');
  const [relType, setRelType] = useState<DirectRelationshipType>('SPOUSE');

  const loadData = async () => {
    setError('');
    const famRes = await familyService.getMyFamily();
    if (famRes.error || !famRes.family) {
      setError(famRes.error || 'Family not found');
      setLoading(false);
      return;
    }

    setFamily(famRes.family);
    setMembers(famRes.members);

    if (famRes.members.length >= 2) {
      setFromMemberId(famRes.members[0].id);
      setToMemberId(famRes.members[1].id);
    }

    const relRes = await relationshipsService.getFamilyRelationships(famRes.family.id);
    setRelationships(relRes.relationships);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddRelationship = async () => {
    if (!family || !fromMemberId || !toMemberId) {
      Alert.alert('Validation', 'Please select both members.');
      return;
    }

    if (fromMemberId === toMemberId) {
      Alert.alert('Validation', 'Please select two different family members.');
      return;
    }

    setSaving(true);
    const res = await relationshipsService.addRelationship(
      family.id,
      fromMemberId,
      toMemberId,
      relType
    );
    setSaving(false);

    if (res.error) {
      Alert.alert('Error', res.error);
    } else {
      Alert.alert('Success', 'Relationship linked successfully!');
      loadData();
    }
  };

  const handleDelete = async (relId: string) => {
    Alert.alert('Unlink Relationship', 'Are you sure you want to remove this connection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unlink',
        style: 'destructive',
        onPress: async () => {
          const res = await relationshipsService.deleteRelationship(relId);
          if (res.error) {
            Alert.alert('Error', res.error);
          } else {
            loadData();
          }
        },
      },
    ]);
  };

  if (loading) {
    return <LoadingState message="Loading family relationships..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const memberMap = new Map(members.map((m) => [m.id, m]));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TopBar title="Link Relations / સંબંધો જોડો" showBack />
      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Explicitly link spouses and parent-child connections to arrange your family tree graph.
        </Text>

      {/* Add New Relationship Card */}
      <Card style={styles.formCard}>
        <Text style={[styles.cardHeading, { color: theme.text }]}>
          + Link Two Members
        </Text>

        {/* Member A */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Person A:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalPills}>
            {members.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => setFromMemberId(m.id)}
                style={[
                  styles.memberPill,
                  {
                    backgroundColor: fromMemberId === m.id ? theme.primary : theme.backgroundElement,
                    borderColor: fromMemberId === m.id ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={[styles.pillText, { color: fromMemberId === m.id ? '#FFFFFF' : theme.text }]}>
                  {m.name} ({m.display_relation?.split('/')[0].trim() || m.relation})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Relationship Type */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Relationship Type:</Text>
          <View style={styles.pillRow}>
            {(['SPOUSE', 'PARENT'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setRelType(t)}
                style={[
                  styles.relTypePill,
                  {
                    backgroundColor: relType === t ? theme.primary : theme.backgroundElement,
                    borderColor: relType === t ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={[styles.pillText, { color: relType === t ? '#FFFFFF' : theme.text }]}>
                  {t === 'SPOUSE' ? '💍 SPOUSE (પતિ/પત્ની)' : '👨‍👦 PARENT OF (પિતા/માતા)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Member B */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Person B:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalPills}>
            {members
              .filter((m) => m.id !== fromMemberId)
              .map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setToMemberId(m.id)}
                  style={[
                    styles.memberPill,
                    {
                      backgroundColor: toMemberId === m.id ? theme.primary : theme.backgroundElement,
                      borderColor: toMemberId === m.id ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.pillText, { color: toMemberId === m.id ? '#FFFFFF' : theme.text }]}>
                    {m.name} ({m.display_relation?.split('/')[0].trim() || m.relation})
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>

        <Button
          title="Save Link / સંબંધ જોડો"
          onPress={handleAddRelationship}
          loading={saving}
          size="md"
          style={styles.saveBtn}
        />
      </Card>

      {/* Existing Relationships List */}
      <View style={styles.listSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Existing Connections / જોડાયેલા સંબંધો ({relationships.length})
        </Text>

        {relationships.length === 0 ? (
          <Text style={[styles.emptyNote, { color: theme.textSecondary }]}>
            No explicit relationship connections saved yet. The tree will use automatic relationship fallbacks.
          </Text>
        ) : (
          relationships.map((rel) => {
            const fromM = memberMap.get(rel.from_member_id);
            const toM = memberMap.get(rel.to_member_id);
            if (!fromM || !toM) return null;

            return (
              <Card key={rel.id} style={styles.relCard}>
                <View style={styles.relCardRow}>
                  <View style={styles.relCardInfo}>
                    <Text style={[styles.relCardText, { color: theme.text }]}>
                      <Text style={{ fontWeight: '700' }}>{fromM.name}</Text>
                      {rel.relationship_type === 'SPOUSE' ? ' 💍 is Spouse of ' : ' 👨‍👦 is Parent of '}
                      <Text style={{ fontWeight: '700' }}>{toM.name}</Text>
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleDelete(rel.id)}
                    style={styles.deleteBtn}
                  >
                    <Text style={[styles.deleteText, { color: theme.error }]}>Unlink</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </View>
    </ScrollView>
  </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
    paddingTop: 8,
  },
  backBtn: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  formCard: {
    padding: 18,
    marginBottom: 20,
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  horizontalPills: {
    flexDirection: 'row',
  },
  memberPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  relTypePill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    marginTop: 10,
  },
  listSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  emptyNote: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  relCard: {
    padding: 12,
    marginBottom: 8,
  },
  relCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  relCardInfo: {
    flex: 1,
  },
  relCardText: {
    fontSize: 14,
  },
  deleteBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
