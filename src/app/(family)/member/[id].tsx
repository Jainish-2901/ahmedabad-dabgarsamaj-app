import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/constants/theme';
import { membersService } from '@/features/members/membersService';
import { familyService } from '@/features/family/familyService';
import { relationshipsService } from '@/features/tree/relationshipsService';
import { Area, EducationRecord, Family, FamilyMember, OccupationRecord } from '@/types/database';
import { formatDate, formatAgeShort } from '@/lib/utils/date';
import { getOccupationDisplay } from '@/constants/occupations';
import { RELATIONSHIPS } from '@/constants/relationships';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { TopBar } from '@/components/navigation/TopBar';

export default function MemberDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();

  const [member, setMember] = useState<FamilyMember | null>(null);
  const [education, setEducation] = useState<EducationRecord | null>(null);
  const [occupation, setOccupation] = useState<OccupationRecord | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [connectedPersonName, setConnectedPersonName] = useState<string>('');
  const [connectedRelationLabel, setConnectedRelationLabel] = useState<string>('');

  const [isOwnFamily, setIsOwnFamily] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setError('');

    const areaRes = await familyService.getAreas();
    setAreas(areaRes.data);

    const res = await membersService.getMemberById(id);
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }

    if (res.member) {
      const currentMember = res.member;
      setMember(currentMember);
      setEducation(res.education || null);
      setOccupation(res.occupation || null);

      // Fetch the member's family & check ownership
      let targetFamily: Family | null = null;
      let targetMembers: FamilyMember[] = [];

      const famRes = await familyService.getMyFamily();
      const isMyFamily = Boolean(famRes.family && famRes.family.id === currentMember.family_id);
      setIsOwnFamily(isMyFamily);

      if (famRes.family && famRes.family.id === currentMember.family_id) {
        targetFamily = famRes.family;
        targetMembers = famRes.members;
      } else {
        const directFamRes = await familyService.getFamilyById(currentMember.family_id);
        if (directFamRes.family) {
          targetFamily = directFamRes.family;
          targetMembers = directFamRes.members;
        }
      }

      if (targetFamily) {
        setFamily(targetFamily);

        // Find relationship with other family members
        const relRes = await relationshipsService.getFamilyRelationships(targetFamily.id);
        const matchedRel = relRes.relationships.find(
          (r) => r.from_member_id === id || r.to_member_id === id
        );

        if (matchedRel) {
          const otherId = matchedRel.from_member_id === id ? matchedRel.to_member_id : matchedRel.from_member_id;
          const otherMember = targetMembers.find((m) => m.id === otherId);
          if (otherMember) {
            setConnectedPersonName(otherMember.name);
            const relDef = RELATIONSHIPS.find((r) => r.code === (currentMember.relation || otherMember.relation));
            setConnectedRelationLabel(relDef?.relationOf || matchedRel.relationship_type);
          }
        }
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleDelete = () => {
    if (!member || !isOwnFamily) return;
    Alert.alert(
      'Delete Member / સભ્ય ડીલીટ કરો?',
      `Are you sure you want to delete ${member.name} from your family directory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete / ડીલીટ',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const res = await membersService.archiveMember(member.id);
            setDeleting(false);
            if (res.error) {
              Alert.alert('Error', res.error);
            } else {
              Alert.alert('Deleted', `${member.name} has been removed from your active family directory.`, [
                { text: 'OK', onPress: () => router.replace('/(family)/home' as any) },
              ]);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingState message="Loading member profile..." />;
  }

  if (error || !member) {
    return <ErrorState message={error || 'Member not found'} onRetry={loadData} />;
  }

  const memberArea = areas.find((a) => a.id === (member.separate_area_id || family?.area_id));
  const occDetails = occupation?.details || member.occupation_details || {};

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TopBar
        title={member.name}
        showBack
        rightAction={
          isOwnFamily ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push(`/(family)/edit-member/${member.id}` as any)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.primaryLight,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.primary }}>
                ✏️ Edit / સુધારો
              </Text>
            </TouchableOpacity>
          ) : (
            <View
              style={{
                backgroundColor: theme.backgroundElement,
                paddingHorizontal: 8,
                paddingVertical: 5,
                borderRadius: 6,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary }}>
                📖 Directory
              </Text>
            </View>
          )
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Overview Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Avatar
              name={member.name}
              photoUrl={member.photo_url}
              gender={member.gender}
              size={72}
              enablePreview={true}
              subtitle={member.display_relation}
            />
            <View style={styles.profileHeaderInfo}>
              <Text style={[styles.profileName, { color: theme.text }]}>
                {member.is_deceased ? `🕊️ સ્વ. ${member.name}` : member.name}
              </Text>
              <Text style={[styles.profileRelation, { color: theme.primary }]}>
                {member.display_relation}
                {connectedPersonName ? ` (of ${connectedPersonName})` : ''}
              </Text>
              <View style={styles.badgeRow}>
                <Badge
                  label={member.gender}
                  variant={member.gender === 'Female' ? 'warning' : 'primary'}
                  size="sm"
                />
                {member.is_deceased ? (
                  <Badge
                    label="🕊️ સ્વર્ગસ્થ (Late)"
                    variant="neutral"
                    size="sm"
                    style={{ marginLeft: 6 }}
                  />
                ) : (
                  member.dob || member.age !== undefined ? (
                    <Badge
                      label={formatAgeShort(member.dob, member.age)}
                      variant="neutral"
                      size="sm"
                      style={{ marginLeft: 6 }}
                    />
                  ) : null
                )}
              </View>
            </View>
          </View>
        </Card>

        {/* 1. Basic & Contact Details */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Personal Information / વ્યક્તિગત વિગત
          </Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
              Status / સ્થિતિ:
            </Text>
            <Text style={[styles.detailValue, { color: member.is_deceased ? '#64748B' : '#16A34A', fontWeight: '700' }]}>
              {member.is_deceased ? '🕊️ સ્વર્ગસ્થ / Deceased (Late)' : '🟢 હયાત / Living'}
            </Text>
          </View>
          {member.deceased_date ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                સ્વર્ગવાસ તારીખ:
              </Text>
              <Text style={[styles.detailValue, { color: theme.text, fontWeight: '700' }]}>
                🕊️ {formatDate(member.deceased_date) || member.deceased_date}
              </Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
              Date of Birth:
            </Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {formatDate(member.dob)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
              Mobile Number:
            </Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {member.mobile ? `📞 ${member.mobile}` : 'Not provided'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
              Relationship:
            </Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {member.display_relation}
            </Text>
          </View>
          {connectedPersonName ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                Connected Relative:
              </Text>
              <Text style={[styles.detailValue, { color: theme.primary, fontWeight: '700' }]}>
                🔗 {connectedPersonName}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* 2. Education Details */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Education / શિક્ષણ
          </Text>
          {education ? (
            <>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Course / Standard:
                </Text>
                <Text style={[styles.detailValue, { color: theme.text, fontWeight: '700' }]}>
                  {education.course_or_standard}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Level:
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {education.education_level}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Status:
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {education.education_status}
                </Text>
              </View>
              {education.passing_year ? (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                    Passing Year:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {education.passing_year}
                  </Text>
                </View>
              ) : null}
              {education.institution ? (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                    Institution:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {education.institution}
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <Text style={[styles.notProvidedText, { color: theme.textSecondary }]}>
              {member.education_status ? `Status: ${member.education_status}` : 'No detailed education record added.'}
            </Text>
          )}
        </Card>

        {/* 3. Occupation Details */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Occupation / વ્યવસાય
          </Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
              Category:
            </Text>
            <Text style={[styles.detailValue, { color: theme.text, fontWeight: '700' }]}>
              {getOccupationDisplay(member.occupation_type)}
            </Text>
          </View>

          {/* Dynamic Details from Record / Dict */}
          {occupation?.organization_name ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                Organization / School:
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {occupation.organization_name}
              </Text>
            </View>
          ) : null}

          {occupation?.designation ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                Designation / Role:
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {occupation.designation}
              </Text>
            </View>
          ) : null}

          {occupation?.business_name ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                Business / Shop Name:
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {occupation.business_name}
              </Text>
            </View>
          ) : null}

          {occupation?.work_location ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                Work Location:
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {occupation.work_location}
              </Text>
            </View>
          ) : null}

          {/* Render extra dynamic key-values from occupation details */}
          {Object.entries(occDetails).map(([k, v]) => {
            if (!v || ['organization_name', 'designation', 'business_name', 'work_location'].includes(k)) return null;
            const formattedKey = k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
            return (
              <View key={k} style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  {formattedKey}:
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {String(v)}
                </Text>
              </View>
            );
          })}
        </Card>

        {/* 4. Residence Details */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Residence / રહેઠાણ
          </Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
              Residence Type:
            </Text>
            <Text style={[styles.detailValue, { color: theme.text, fontWeight: '700' }]}>
              {member.residence_type === 'SAME_AS_FAMILY'
                ? '🏠 Same as Family'
                : '🏢 Living Separately'}
            </Text>
          </View>

          {member.residence_type === 'SAME_AS_FAMILY' && family ? (
            <>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Address:
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {family.address}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Area / City:
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {memberArea?.name || family.city} - {family.pincode}
                </Text>
              </View>
            </>
          ) : null}

          {member.residence_type === 'SEPARATE' && member.separate_address ? (
            <>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Address:
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {member.separate_address}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Area / City:
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {memberArea?.name || member.separate_city || 'Ahmedabad'} - {member.separate_pincode}
                </Text>
              </View>
            </>
          ) : null}
        </Card>

        {/* Actions - Only visible for own family */}
        {isOwnFamily ? (
          <View style={styles.actionsContainer}>
            <Button
              title="Edit Member / સુધારો કરો"
              variant="outline"
              onPress={() => router.push(`/(family)/edit-member/${member.id}` as any)}
              style={styles.actionBtn}
            />

            {member.relation !== 'FAMILY_HEAD' ? (
              <Button
                title="Delete Member / સભ્ય ડીલીટ કરો"
                variant="danger"
                loading={deleting}
                onPress={handleDelete}
                style={styles.actionBtn}
              />
            ) : null}
          </View>
        ) : null}
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
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  profileCard: {
    padding: 18,
    marginBottom: 14,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileHeaderInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
  },
  profileRelation: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  notProvidedText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  actionsContainer: {
    marginTop: 12,
    gap: 10,
  },
  actionBtn: {
    width: '100%',
  },
});
