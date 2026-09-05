import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { EducationRecord, Family, FamilyMember, OccupationRecord } from '@/types/database';
import { formatDate, formatAgeShort } from '@/lib/utils/date';
import { getOccupationDisplay } from '@/constants/occupations';
import { RELATIONSHIPS } from '@/constants/relationships';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { TopBar } from '@/components/navigation/TopBar';
import { useAuth } from '@/features/auth/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function MemberDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { user } = useAuth();

  const [member, setMember] = useState<FamilyMember | null>(null);
  const [education, setEducation] = useState<EducationRecord | null>(null);
  const [occupation, setOccupation] = useState<OccupationRecord | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [connectedPersonName, setConnectedPersonName] = useState<string>('');
  const [connectedRelationLabel, setConnectedRelationLabel] = useState<string>('');

  const [isOwnFamily, setIsOwnFamily] = useState(false);
  const [isViewerHead, setIsViewerHead] = useState(false);
  const [canViewerEdit, setCanViewerEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [togglingPermission, setTogglingPermission] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setError('');

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

      // Fetch the member's family & check ownership & permissions
      let targetFamily: Family | null = null;
      let targetMembers: FamilyMember[] = [];

      const famRes = await familyService.getMyFamily(user?.id);
      const isMyFamily = Boolean(famRes.family && famRes.family.id === currentMember.family_id);
      setIsOwnFamily(isMyFamily);

      if (famRes.family && famRes.family.id === currentMember.family_id) {
        targetFamily = famRes.family;
        targetMembers = famRes.members;

        // Check viewer's authority:
        // Viewer is Head if they are the head_user_id or the member with relation === 'FAMILY_HEAD'
        const viewerIsHead = Boolean(
          (user && famRes.family.head_user_id === user.id) ||
          famRes.members.some((m) => m.relation === 'FAMILY_HEAD')
        );
        setIsViewerHead(viewerIsHead);

        // Viewer can edit if they are head or if any member record matching user/family has can_edit_family
        const viewerHasEditRights = viewerIsHead || famRes.members.some((m) => m.can_edit_family === true);
        setCanViewerEdit(viewerHasEditRights);
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

  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [permissionEmail, setPermissionEmail] = useState('');
  const [permissionEmailError, setPermissionEmailError] = useState('');

  const openPermissionModal = () => {
    if (!member) return;
    const currentEmail = member.email || (member.occupation_details as any)?.email || '';
    setPermissionEmail(currentEmail);
    setPermissionEmailError('');
    setPermissionModalVisible(true);
  };

  const handleGrantPermission = async () => {
    if (!member) return;
    const cleanEmail = permissionEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setPermissionEmailError('કૃપા કરીને સભ્યનો ઈમેઈલ આઈડી દાખલ કરો.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setPermissionEmailError('કૃપા કરીને સાચો ઈમેઈલ એડ્રેસ દાખલ કરો (e.g. name@gmail.com).');
      return;
    }

    setTogglingPermission(true);
    const res = await membersService.toggleEditPermission(member.id, true, cleanEmail);
    setTogglingPermission(false);

    if (res.error) {
      Alert.alert('Error', res.error);
    } else {
      setMember({ ...member, can_edit_family: true, email: cleanEmail });
      setPermissionModalVisible(false);
      Alert.alert(
        'પરવાનગી અપડેટ થઈ / Permission Granted',
        `${member.name} ને પરિવાર એડિટ કરવાની પરવાનગી સફળતાપૂર્વક આપવામાં આવી છે.\n\nતેઓ તેમના મોબાઈલ નંબર અથવા ઈમેઈલ (${cleanEmail}) અને તમારા પરિવારના મૂળ પાસવર્ડ વડે પણ સીધા જ એપમાં લૉગિન કરી શકશે.`
      );
    }
  };

  const handleRevokePermission = () => {
    if (!member) return;
    Alert.alert(
      'Revoke Permission / પરવાનગી રદ કરો',
      `શું તમે ${member.name} ની પરિવાર એડિટ કરવાની પરવાનગી પાછી ખેંચવા માંગો છો?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'હા, રદ કરો',
          style: 'destructive',
          onPress: async () => {
            setTogglingPermission(true);
            const res = await membersService.toggleEditPermission(member.id, false, member.email);
            setTogglingPermission(false);
            if (res.error) {
              Alert.alert('Error', res.error);
            } else {
              setMember({ ...member, can_edit_family: false });
              Alert.alert('Updated / અપડેટ થયું', `${member.name} ની એડિટ પરવાનગી રદ કરવામાં આવી છે.`);
            }
          },
        },
      ]
    );
  };

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
            const res = await membersService.deleteMember(member.id);
            setDeleting(false);
            if (res.error) {
              Alert.alert('Error', res.error);
            } else {
              Alert.alert(
                'Deleted / સફળતાપૂર્વક ડીલીટ થયું',
                `${member.name} નું નામ અને તમામ વિગતો ડેટાબેઝમાંથી કાયમ માટે ડીલીટ કરવામાં આવી છે.`,
                [{ text: 'OK', onPress: () => router.replace('/(family)/home' as any) }]
              );
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
                {member.blood_group ? (
                  <Badge
                    label={`🩸 ${member.blood_group}`}
                    variant="neutral"
                    size="sm"
                    style={{ marginLeft: 6 }}
                  />
                ) : null}
                {member.can_edit_family && member.relation !== 'FAMILY_HEAD' ? (
                  <Badge
                    label="✏️ Authorized Editor"
                    variant="success"
                    size="sm"
                    style={{ marginLeft: 6 }}
                  />
                ) : null}
              </View>
            </View>
          </View>
        </Card>

        {/* Family Head Permission Control Card (Only visible to Family Head for other living members) */}
        {isOwnFamily && isViewerHead && member.relation !== 'FAMILY_HEAD' && !member.is_deceased ? (
          <Card
            style={[
              styles.permissionCard,
              {
                backgroundColor: member.can_edit_family ? '#ECFDF5' : theme.card,
                borderColor: member.can_edit_family ? '#10B981' : theme.border,
              },
            ]}
          >
            <View style={styles.permissionHeader}>
              <View style={[styles.permissionIconCircle, { backgroundColor: member.can_edit_family ? '#D1FAE5' : theme.backgroundElement }]}>
                <Ionicons
                  name={member.can_edit_family ? 'shield-checkmark' : 'shield-outline'}
                  size={24}
                  color={member.can_edit_family ? '#059669' : theme.textSecondary}
                />
              </View>

              <View style={styles.permissionInfo}>
                <Text style={[styles.permissionTitle, { color: theme.text }]}>
                  પરિવાર એડિટ પરવાનગી (Edit Access)
                </Text>
                <Text style={[styles.permissionSubtitle, { color: theme.textSecondary }]}>
                  {member.can_edit_family
                    ? `${member.name} પરિવારના સભ્યો ઉમેરી અને સુધારી શકે છે.`
                    : `${member.name} ને પરિવાર એડિટ કરવાની પરવાનગી આપો.`}
                </Text>
              </View>
            </View>

            {member.can_edit_family ? (
              <View style={[styles.authorizedEmailBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="mail" size={16} color="#15803D" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#15803D' }}>
                    ઓથોરાઇઝ્ડ ઈમેઈલ (Authorized Email):
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#166534', marginTop: 3 }}>
                  {member.email || (member.occupation_details as any)?.email || 'ઈમેઈલ દાખલ કરેલ નથી'}
                </Text>
                <Text style={{ fontSize: 11, color: '#15803D', marginTop: 4 }}>
                  પાસવર્ડ રીસેટ કરવા માટેનો ૬ આંકડાનો OTP આ ઈમેઈલ પર મોકલવામાં આવશે.
                </Text>
              </View>
            ) : null}

            <View style={{ marginTop: 12 }}>
              {member.can_edit_family ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button
                    title="ઈમેઈલ બદલો / Edit Email"
                    variant="outline"
                    onPress={openPermissionModal}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="પરવાનગી રદ કરો"
                    variant="danger"
                    loading={togglingPermission}
                    onPress={handleRevokePermission}
                    style={{ flex: 1 }}
                  />
                </View>
              ) : (
                <Button
                  title="પરવાનગી આપો / Grant Edit Access"
                  variant="primary"
                  loading={togglingPermission}
                  onPress={openPermissionModal}
                />
              )}
            </View>
          </Card>
        ) : null}

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
          {member.blood_group ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                બ્લડ ગ્રૂપ / Blood Group:
              </Text>
              <Text style={[styles.detailValue, { color: '#DC2626', fontWeight: '800' }]}>
                🩸 {member.blood_group}
              </Text>
            </View>
          ) : null}
          {member.birth_place ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                જન્મ સ્થળ / Birth Place:
              </Text>
              <Text style={[styles.detailValue, { color: theme.text, fontWeight: '700' }]}>
                🏛️ {member.birth_place}
              </Text>
            </View>
          ) : null}
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
                  City / Pincode:
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {family.city} - {family.pincode}
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
                  City / Pincode:
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {member.separate_city || 'Ahmedabad'} - {member.separate_pincode}
                </Text>
              </View>
            </>
          ) : null}
        </Card>

        {/* Actions - Visible for own family if viewer has edit permission */}
        {isOwnFamily && canViewerEdit ? (
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

      {/* Modal for setting member email when granting edit access */}
      <Modal
        visible={permissionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPermissionModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="shield-checkmark" size={28} color="#10B981" />
                </View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {member?.can_edit_family ? 'ઓથોરાઇઝ્ડ ઈમેઈલ અપડેટ કરો' : 'એડિટ પરવાનગી આપો'}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  {member?.name} પરિવારની વિગતો સુધારી શકશે
                </Text>
              </View>

              <View style={[styles.modalNoticeBox, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                <Ionicons name="information-circle" size={18} color="#1D4ED8" style={{ marginRight: 6 }} />
                <Text style={[styles.modalNoticeText, { color: '#1E40AF' }]}>
                  સભ્યનો ઈમેઈલ આઈડી દાખલ કરો જેથી ભવિષ્યમાં પાસવર્ડ રીસેટ કરતી વખતે OTP સીધો આ ઈમેઈલ પર મેળવી શકાય.
                </Text>
              </View>

              <View style={{ marginTop: 16 }}>
                <Input
                  label="સભ્યનો Email ID (Member Email)"
                  placeholder="e.g. member@gmail.com"
                  value={permissionEmail}
                  onChangeText={(text) => {
                    setPermissionEmail(text);
                    if (permissionEmailError) setPermissionEmailError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={permissionEmailError}
                />
              </View>

              <View style={styles.modalActions}>
                <Button
                  title="રદ કરો / Cancel"
                  variant="outline"
                  onPress={() => setPermissionModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title={member?.can_edit_family ? 'સાચવો / Save' : 'પરવાનગી આપો'}
                  variant="primary"
                  loading={togglingPermission}
                  onPress={handleGrantPermission}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  permissionCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  permissionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  permissionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  authorizedEmailBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 440,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
  },
  modalNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  modalNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
});
