import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
import { Family, FamilyMember } from '@/types/database';
import { RELATIONSHIPS } from '@/constants/relationships';
import {
  EDUCATION_LEVELS,
  EDUCATION_STATUSES,
  getCoursesForLevel,
} from '@/constants/education';
import { OCCUPATIONS } from '@/constants/occupations';
import { formatDate, formatDateForDB, formatAge, isValidDOB } from '@/lib/utils/date';
import { PhotoUploadField } from '@/components/ui/PhotoUploadField';
import { imageService } from '@/lib/storage/imageService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { TopBar } from '@/components/navigation/TopBar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/AuthContext';

export default function EditMemberScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [family, setFamily] = useState<Family | null>(null);
  const [otherMembers, setOtherMembers] = useState<FamilyMember[]>([]);

  // Active Tab / Section
  const [activeSection, setActiveSection] = useState<'basic' | 'education' | 'occupation' | 'residence'>('basic');

  // 1. Basic Details
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [isDeceased, setIsDeceased] = useState<boolean>(false);
  const [deceasedDate, setDeceasedDate] = useState<string>('');

  const handleSetIsDeceased = (val: boolean) => {
    setIsDeceased(val);
    if (val) {
      setActiveSection('basic');
      setResidenceType('SAME_AS_FAMILY');
    }
  };

  const [dob, setDob] = useState('');
  const [mobile, setMobile] = useState('');
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [birthPlace, setBirthPlace] = useState<string>('');
  const [relation, setRelation] = useState('');
  const [relSearch, setRelSearch] = useState('');
  const [connectedMemberId, setConnectedMemberId] = useState<string>('');

  // 2. Education Details
  const [educationLevel, setEducationLevel] = useState('Undergraduate');
  const [courseOrStd, setCourseOrStd] = useState('BCA');
  const [customCourse, setCustomCourse] = useState('');
  const [eduStatus, setEduStatus] = useState<'Studying' | 'Completed' | 'Discontinued'>('Studying');
  const [passingYear, setPassingYear] = useState('');
  const [institution, setInstitution] = useState('');

  // 3. Occupation Details
  const [occupationType, setOccupationType] = useState('STUDENT');
  const [occupationDetails, setOccupationDetails] = useState<Record<string, string>>({});

  // 4. Residence Details
  const [residenceType, setResidenceType] = useState<'SAME_AS_FAMILY' | 'SEPARATE'>('SAME_AS_FAMILY');
  const [separateAddress, setSeparateAddress] = useState('');
  const [separateCity, setSeparateCity] = useState('');
  const [separatePincode, setSeparatePincode] = useState('');

  useEffect(() => {
    if (!id || !user?.id) return;

    const loadAll = async () => {
      const famRes = await familyService.getMyFamily(user.id);
      if (famRes.family) {
        setFamily(famRes.family);
        const others = famRes.members.filter((m) => m.id !== id);
        setOtherMembers(others);

        // Fetch relationships to see who this member is already connected with
        const relRes = await relationshipsService.getFamilyRelationships(famRes.family.id);
        const existingRel = relRes.relationships.find(
          (r) => r.from_member_id === id || r.to_member_id === id
        );
        if (existingRel) {
          const partnerId = existingRel.from_member_id === id ? existingRel.to_member_id : existingRel.from_member_id;
          setConnectedMemberId(partnerId);
        } else if (others.length > 0) {
          const head = others.find((m) => m.relation === 'FAMILY_HEAD');
          setConnectedMemberId(head ? head.id : others[0].id);
        }
      }

      const memRes = await membersService.getMemberById(id);
      if (memRes.error) {
        setError(memRes.error);
        setLoading(false);
        return;
      }

      if (memRes.member) {
        const m = memRes.member;

        // Security check: Only members belonging to the current user's family can be edited
        if (famRes.family && m.family_id !== famRes.family.id) {
          Alert.alert(
            'Access Denied / પરવાનગી નથી',
            'You can only edit members of your own family. / આપ ફક્ત આપના પોતાના પરિવારના સભ્યોની વિગતોમાં જ સુધારો કરી શકો છો.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
          setLoading(false);
          return;
        }

        setName(m.name);
        setPhotoUrl(m.photo_url || null);
        setGender((m.gender as any) || 'Male');
        setIsDeceased(m.is_deceased === true || (m as any).status === 'DECEASED' || m.occupation_details?.is_deceased === true);
        setDeceasedDate(m.deceased_date || '');
        setDob(formatDate(m.dob));
        setMobile(m.mobile || '');
        setBloodGroup(m.blood_group || (m.occupation_details as any)?.blood_group || '');
        setBirthPlace(m.birth_place || (m.occupation_details as any)?.birth_place || '');
        setRelation(m.relation);
        setResidenceType(m.residence_type);
        setSeparateAddress(m.separate_address || '');
        setSeparateCity(m.separate_city || '');
        setSeparatePincode(m.separate_pincode || '');

        if (memRes.education) {
          setEducationLevel(memRes.education.education_level);
          setCourseOrStd(memRes.education.course_or_standard);
          setEduStatus((memRes.education.education_status as any) || 'Studying');
          setPassingYear(memRes.education.passing_year ? String(memRes.education.passing_year) : '');
          setInstitution(memRes.education.institution || '');
        }

        if (memRes.occupation) {
          setOccupationType(memRes.occupation.occupation_type);
          if (memRes.occupation.details) {
            setOccupationDetails(memRes.occupation.details);
          }
        } else if (m.occupation_type) {
          setOccupationType(m.occupation_type);
          if (m.occupation_details) {
            setOccupationDetails(m.occupation_details);
          }
        }
      }
      setLoading(false);
    };

    loadAll();
  }, [id]);

  const selectedRel = RELATIONSHIPS.find((r) => r.code === relation);

  const filteredRelationships = RELATIONSHIPS.filter((r) => {
    if (r.code === 'FAMILY_HEAD') return false;
    if (!relSearch.trim()) return true;
    const query = relSearch.toLowerCase();
    return (
      r.englishLabel.toLowerCase().includes(query) ||
      r.gujaratiLabel.toLowerCase().includes(query) ||
      r.displayLabel.toLowerCase().includes(query)
    );
  });

  const handleSave = async () => {
    if (!id) return;
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Member name is mandatory.');
      return;
    }

    if (!isDeceased) {
      if (!dob.trim()) {
        Alert.alert('Validation Error', 'Date of Birth is mandatory for living members.');
        return;
      }
      if (!isValidDOB(dob.trim())) {
        Alert.alert('Validation Error', 'Please enter a valid Date of Birth in DD-MM-YYYY format (e.g. 15-08-1995).');
        return;
      }
    } else {
      if (dob.trim() && !isValidDOB(dob.trim())) {
        Alert.alert('Validation Error', 'Please enter a valid Date of Birth in DD-MM-YYYY format or leave it blank.');
        return;
      }
    }

    setSaving(true);

    let finalPhotoUrl = photoUrl;
    if (photoUrl && (photoBase64 || photoUrl.startsWith('blob:') || photoUrl.startsWith('data:') || photoUrl.startsWith('file:'))) {
      const head = otherMembers.find((m) => m.relation === 'FAMILY_HEAD');
      const uploadRes = await imageService.uploadMemberPhoto({
        uri: photoUrl,
        base64: photoBase64,
        familyId: family?.id || 'general',
        headName: head?.name || 'head',
        memberName: name,
      });
      finalPhotoUrl = uploadRes.url;
    }

    const finalCourse = !isDeceased && courseOrStd.includes('Other') && customCourse.trim()
      ? customCourse.trim()
      : courseOrStd;

    const res = await membersService.updateMember(
      id,
      {
        name,
        photo_url: finalPhotoUrl,
        gender,
        dob: dob.trim() ? formatDateForDB(dob.trim()) : '',
        relation,
        mobile: isDeceased ? null : (mobile.trim() || null),
        blood_group: isDeceased ? null : (bloodGroup.trim() || null),
        birth_place: isDeceased ? null : (birthPlace.trim() || null),
        residence_type: isDeceased ? 'SAME_AS_FAMILY' : residenceType,
        separate_address: !isDeceased && residenceType === 'SEPARATE' ? separateAddress.trim() || null : null,
        separate_area_id: null,
        separate_city: !isDeceased && residenceType === 'SEPARATE' ? separateCity.trim() || null : null,
        separate_pincode: !isDeceased && residenceType === 'SEPARATE' ? separatePincode.trim() || null : null,
        occupation_type: isDeceased ? undefined : occupationType,
        is_deceased: isDeceased,
        deceased_date: isDeceased && deceasedDate.trim() ? deceasedDate.trim() : null,
        status: 'ACTIVE',
      },
      isDeceased ? undefined : {
        education_level: educationLevel,
        course_or_standard: finalCourse,
        education_status: eduStatus,
        passing_year: passingYear ? parseInt(passingYear, 10) : undefined,
        institution,
      },
      isDeceased ? undefined : {
        occupation_type: occupationType,
        details: occupationDetails,
      }
    );

    // Update relationship link if family exists
    if (family && selectedRel && connectedMemberId) {
      if (selectedRel.connectType === 'spouse_of') {
        await relationshipsService.addRelationship(
          family.id,
          id,
          connectedMemberId,
          'SPOUSE'
        );
      } else if (selectedRel.connectType === 'child_of') {
        await relationshipsService.addRelationship(
          family.id,
          connectedMemberId,
          id,
          'PARENT'
        );
      } else if (selectedRel.connectType === 'parent_of') {
        await relationshipsService.addRelationship(
          family.id,
          id,
          connectedMemberId,
          'PARENT'
        );
      }
    }

    setSaving(false);

    if (res.error) {
      Alert.alert('Save Error', res.error);
    } else {
      Alert.alert('Updated Successfully', `${name}'s complete profile has been updated.`, [
        {
          text: 'OK',
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(family)/members' as any);
            }
          },
        },
      ]);
    }
  };

  if (loading) {
    return <LoadingState message="Loading member for editing..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(family)/members' as any);
          }
        }}
      />
    );
  }

  const selectedOcc = OCCUPATIONS.find((o) => o.code === occupationType);
  const availableCourses = getCoursesForLevel(educationLevel);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <TopBar title={`Edit ${name || 'Member'}`} showBack />

      {/* Nav Tab Bar - Only show tabs for living members */}
      {!isDeceased ? (
        <View style={[styles.tabBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <View style={styles.tabBarInner}>
            {(
              [
                { id: 'basic', label: '1. Basic', icon: 'person' },
                { id: 'education', label: '2. Education', icon: 'school' },
                { id: 'occupation', label: '3. Occupation', icon: 'briefcase' },
                { id: 'residence', label: '4. Residence', icon: 'home' },
              ] as const
            ).map((tab) => (
              <TouchableOpacity
                key={tab.id}
                activeOpacity={0.7}
                onPress={() => setActiveSection(tab.id)}
                style={[
                  styles.navTab,
                  {
                    borderBottomColor: activeSection === tab.id ? theme.primary : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.navTabText,
                    {
                      color: activeSection === tab.id ? theme.primary : theme.textSecondary,
                      fontWeight: activeSection === tab.id ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View style={[styles.tabBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <View style={styles.tabBarInner}>
            <View style={[styles.navTab, { borderBottomColor: theme.primary }]}>
              <Text style={[styles.navTabText, { color: theme.primary, fontWeight: '700' }]}>
                🕊️ સ્વર્ગસ્થ સભ્ય વિગત (Late Member Details)
              </Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* 1. BASIC DETAILS SECTION */}
        {activeSection === 'basic' && (
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Basic Details / વ્યક્તિગત માહિતી</Text>

            {/* Member Profile Photo */}
            <PhotoUploadField
              label="Member Photo / સભ્યનો ફોટો"
              name={name}
              gender={gender}
              photoUrl={photoUrl}
              onPhotoSelected={(uri, base64) => {
                setPhotoUrl(uri);
                if (base64) setPhotoBase64(base64);
              }}
              onPhotoRemoved={() => {
                setPhotoUrl(null);
                setPhotoBase64(null);
              }}
            />

            <Input label="Full Name / પૂરું નામ *" value={name} onChangeText={setName} />

            {/* Gender */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Gender / જાતિ</Text>
              <View style={styles.gridRow}>
                {(['Male', 'Female'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setGender(g)}
                    style={[
                      styles.choiceButton,
                      {
                        backgroundColor: gender === g ? theme.primary : theme.backgroundElement,
                        borderColor: gender === g ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.choiceText, { color: gender === g ? '#FFFFFF' : theme.text }]}>
                      {g === 'Male' ? '👨 Male / પુરુષ' : '👩 Female / સ્ત્રી'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Member Life Status (Living vs Deceased) */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>
                સભ્યની સ્થિતિ / Life Status *
              </Text>
              <View style={styles.gridRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSetIsDeceased(false)}
                  style={[
                    styles.choiceButton,
                    {
                      backgroundColor: !isDeceased ? theme.primary : theme.backgroundElement,
                      borderColor: !isDeceased ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.choiceText, { color: !isDeceased ? '#FFFFFF' : theme.text }]}>
                    🟢 હયાત (Living)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSetIsDeceased(true)}
                  style={[
                    styles.choiceButton,
                    {
                      backgroundColor: isDeceased ? '#475569' : theme.backgroundElement,
                      borderColor: isDeceased ? '#475569' : theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.choiceText, { color: isDeceased ? '#FFFFFF' : theme.text }]}>
                    🕊️ સ્વર્ગસ્થ / સ્વ. (Late)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {isDeceased ? (
              <Input
                label="Date / Year of Demise / સ્વર્ગવાસ તારીખ અથવા વર્ષ (મરજિયાત / Optional)"
                placeholder="e.g. 15-08-2021 or 2021 (ખબર ન હોય તો ખાલી રાખો)"
                value={deceasedDate}
                onChangeText={setDeceasedDate}
                helperText="સ્વર્ગવાસ તારીખ કે વર્ષની ચોક્કસ માહિતી ન હોય તો ખાલી રાખી શકાય છે"
              />
            ) : null}

            <Input
              label={
                isDeceased
                  ? 'Date of Birth / જન્મ તારીખ (DD-MM-YYYY) (મરજિયાત / Optional)'
                  : 'Date of Birth / જન્મ તારીખ (DD-MM-YYYY) *'
              }
              placeholder={isDeceased ? 'e.g. 15-08-1950 (ખબર ન હોય તો ખાલી રાખો)' : 'e.g. 15-08-1995'}
              value={dob}
              onChangeText={setDob}
              helperText={
                dob.trim() && formatAge(dob, undefined, isDeceased && deceasedDate.trim() ? deceasedDate.trim() : null) !== 'N/A'
                  ? `${isDeceased ? 'Age at Demise (અવસાન સમયે ઉંમર)' : 'Calculated Age (ઉંમર)'}: ${formatAge(dob, undefined, isDeceased && deceasedDate.trim() ? deceasedDate.trim() : null)}`
                  : (isDeceased ? 'સ્વર્ગસ્થ સભ્ય માટે જન્મ તારીખ મરજિયાત છે (ખાલી રાખી શકો છો)' : 'Enter DD-MM-YYYY to dynamically compute age')
              }
            />

            {!isDeceased && (
              <>
                <Input label="Mobile Number / મોબાઈલ નંબર" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />

                {/* Blood Group Picker */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.text }]}>Blood Group / બ્લડ ગ્રૂપ</Text>
                  <View style={styles.bloodGrid}>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <TouchableOpacity
                        key={bg}
                        activeOpacity={0.7}
                        onPress={() => setBloodGroup(bloodGroup === bg ? '' : bg)}
                        style={[
                          styles.bloodChip,
                          {
                            backgroundColor: bloodGroup === bg ? '#DC2626' : theme.backgroundElement,
                            borderColor: bloodGroup === bg ? '#DC2626' : theme.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.bloodChipText,
                            { color: bloodGroup === bg ? '#FFFFFF' : theme.text },
                          ]}
                        >
                          {bg}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Birth Place */}
                <Input
                  label="Birth Place / જન્મ સ્થળ (ગામ / શહેર)"
                  placeholder="e.g. અમદાવાદ, પાટણ, વિસનગર, મહેસાણા..."
                  value={birthPlace}
                  onChangeText={setBirthPlace}
                  helperText="સભ્યનું મૂળ ગામ અથવા જન્મ સ્થળ દાખલ કરો"
                />
              </>
            )}

            {/* Searchable Relationship Picker */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Relationship / સંબંધ *</Text>
              <Input
                placeholder="🔍 Search relationship (e.g. wife, son, ભાભી, દીકરો)..."
                value={relSearch}
                onChangeText={setRelSearch}
                style={{ marginBottom: 8 }}
              />

              <ScrollView style={styles.relScrollList} nestedScrollEnabled>
                {filteredRelationships.map((r) => (
                  <TouchableOpacity
                    key={r.code}
                    onPress={() => {
                      setRelation(r.code);
                      if (!connectedMemberId && otherMembers.length > 0) {
                        const head = otherMembers.find((m) => m.relation === 'FAMILY_HEAD');
                        setConnectedMemberId(head ? head.id : otherMembers[0].id);
                      }
                    }}
                    style={[
                      styles.relItem,
                      {
                        backgroundColor: relation === r.code ? theme.primaryLight : 'transparent',
                        borderColor: relation === r.code ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.relText, { color: relation === r.code ? theme.primary : theme.text }]}>
                      {r.displayLabel}
                    </Text>
                    {relation === r.code ? (
                      <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Connected Person Selector in Edit Mode */}
            {selectedRel && selectedRel.connectPrompt && otherMembers.length > 0 ? (
              <View style={[styles.connectedBox, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
                {(() => {
                  const connectedPerson = otherMembers.find((m) => m.id === connectedMemberId);
                  return (
                    <>
                      <Text style={[styles.connectedPrompt, { color: theme.primary, fontWeight: '700' }]}>
                        {connectedPerson && selectedRel.relationOf
                          ? `🔗 ${selectedRel.englishLabel} of ${connectedPerson.name} (${connectedPerson.name} ${selectedRel.relationOf.split('/')[1]?.trim() || ''})`
                          : `🔗 ${selectedRel.connectPrompt}`}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                        Select relative from list / નીચેથી સંબંધિત સભ્ય પસંદ કરો:
                      </Text>
                    </>
                  );
                })()}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {otherMembers.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setConnectedMemberId(m.id)}
                      style={[
                        styles.connectedPill,
                        {
                          backgroundColor: connectedMemberId === m.id ? theme.primary : theme.card,
                          borderColor: theme.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.connectedPillText,
                          { color: connectedMemberId === m.id ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        {m.name} ({m.display_relation?.split('/')[0].trim() || m.relation})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Residence preview for late members */}
            {isDeceased ? (
              <View style={[styles.familyAddressPreview, { backgroundColor: theme.backgroundElement, borderColor: theme.border, borderWidth: 1, marginTop: 14 }]}>
                <Text style={[styles.previewHeading, { color: theme.text }]}>
                  🏠 Residence / રહેઠાણ : Save as family (પરિવાર સાથે)
                </Text>
                <Text style={[styles.previewText, { color: theme.textSecondary, marginTop: 4 }]}>
                  {family?.address ? `${family.address}, ${family.city || 'Ahmedabad'}${family?.pincode ? ` - ${family.pincode}` : ''}` : 'પરિવારનું મૂળ સરનામું સ્વતઃ લાગુ થશે.'}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* 2. EDUCATION SECTION */}
        {activeSection === 'education' && (
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Education Details</Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Level / સ્તર</Text>
              <View style={styles.gridWrap}>
                {EDUCATION_LEVELS.map((lvl) => (
                  <TouchableOpacity
                    key={lvl.value}
                    onPress={() => {
                      setEducationLevel(lvl.value);
                      const courses = getCoursesForLevel(lvl.value);
                      setCourseOrStd(courses[0] || 'Other');
                    }}
                    style={[
                      styles.gridChoiceItem,
                      {
                        backgroundColor: educationLevel === lvl.value ? theme.primary : theme.backgroundElement,
                        borderColor: educationLevel === lvl.value ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.gridChoiceText, { color: educationLevel === lvl.value ? '#FFFFFF' : theme.text }]}>
                      {lvl.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Course / Degree / Standard ({educationLevel})</Text>
              <View style={styles.gridWrap}>
                {availableCourses.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCourseOrStd(c)}
                    style={[
                      styles.gridChoiceItem,
                      {
                        backgroundColor: courseOrStd === c ? theme.primary : theme.backgroundElement,
                        borderColor: courseOrStd === c ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.gridChoiceText, { color: courseOrStd === c ? '#FFFFFF' : theme.text }]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {courseOrStd.includes('Other') && (
              <Input
                label="Specify Other Course / Degree"
                placeholder="e.g. B.Des Fashion / Diploma Civil"
                value={customCourse}
                onChangeText={setCustomCourse}
              />
            )}

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Education Status</Text>
              <View style={styles.gridWrap}>
                {EDUCATION_STATUSES.map((st) => (
                  <TouchableOpacity
                    key={st.value}
                    onPress={() => setEduStatus(st.value as any)}
                    style={[
                      styles.gridChoiceItem,
                      {
                        backgroundColor: eduStatus === st.value ? theme.primary : theme.backgroundElement,
                        borderColor: eduStatus === st.value ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.gridChoiceText, { color: eduStatus === st.value ? '#FFFFFF' : theme.text }]}>
                      {st.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Input label="Passing Year (Optional)" value={passingYear} onChangeText={setPassingYear} keyboardType="number-pad" maxLength={4} />
            <Input label="School / College / University Name" value={institution} onChangeText={setInstitution} />
          </View>
        )}

        {/* 3. OCCUPATION SECTION */}
        {activeSection === 'occupation' && (
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Occupation Details</Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Category</Text>
              <View style={styles.gridWrap}>
                {OCCUPATIONS.map((occ) => (
                  <TouchableOpacity
                    key={occ.code}
                    onPress={() => {
                      setOccupationType(occ.code);
                      setOccupationDetails({});
                    }}
                    style={[
                      styles.gridChoiceItem,
                      {
                        backgroundColor: occupationType === occ.code ? theme.primary : theme.backgroundElement,
                        borderColor: occupationType === occ.code ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.gridChoiceText, { color: occupationType === occ.code ? '#FFFFFF' : theme.text }]}>
                      {occ.displayLabel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {selectedOcc && selectedOcc.fields.length > 0 && (
              <View style={{ marginTop: 12 }}>
                {selectedOcc.fields.map((f) => (
                  <Input
                    key={f.key}
                    label={f.label}
                    placeholder={f.placeholder}
                    value={occupationDetails[f.key] || ''}
                    onChangeText={(val) => setOccupationDetails((prev) => ({ ...prev, [f.key]: val }))}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* 4. RESIDENCE SECTION */}
        {activeSection === 'residence' && (
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Residence Details</Text>

            <View style={styles.gridRow}>
              <TouchableOpacity
                onPress={() => setResidenceType('SAME_AS_FAMILY')}
                style={[
                  styles.choiceButton,
                  {
                    backgroundColor: residenceType === 'SAME_AS_FAMILY' ? theme.primary : theme.backgroundElement,
                    borderColor: residenceType === 'SAME_AS_FAMILY' ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={[styles.choiceText, { color: residenceType === 'SAME_AS_FAMILY' ? '#FFFFFF' : theme.text }]}>
                  🏠 Same as Family
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setResidenceType('SEPARATE')}
                style={[
                  styles.choiceButton,
                  {
                    backgroundColor: residenceType === 'SEPARATE' ? theme.primary : theme.backgroundElement,
                    borderColor: residenceType === 'SEPARATE' ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={[styles.choiceText, { color: residenceType === 'SEPARATE' ? '#FFFFFF' : theme.text }]}>
                  🏢 Living Separately
                </Text>
              </TouchableOpacity>
            </View>

            {/* Current Family Address Preview when Same as Family */}
            {residenceType === 'SAME_AS_FAMILY' ? (
              <View style={[styles.familyAddressPreview, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.previewHeading, { color: theme.text }]}>
                  🏠 Current Family Address / પરિવારનું વર્તમાન સરનામું:
                </Text>
                <Text style={[styles.previewText, { color: theme.textSecondary, marginTop: 4 }]}>
                  {family?.address || 'Family primary residence'}
                </Text>
                <Text style={[styles.previewText, { color: theme.textSecondary }]}>
                  {family?.city || 'Ahmedabad'} - {family?.pincode}
                </Text>
              </View>
            ) : (
              <View style={{ marginTop: 14 }}>
                <Input label="Separate Address / સરનામું *" value={separateAddress} onChangeText={setSeparateAddress} multiline />

                <View style={styles.rowTwo}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Input label="City" value={separateCity} onChangeText={setSeparateCity} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Input label="Pincode" value={separatePincode} onChangeText={setSeparatePincode} keyboardType="number-pad" />
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Save Button */}
        <Button
          title="Save All Changes / સાચવો"
          onPress={handleSave}
          loading={saving}
          size="lg"
          style={{ marginTop: 16 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    borderBottomWidth: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  navTab: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTabText: {
    fontSize: 13,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  formCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  choiceButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridChoiceItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  gridChoiceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  relScrollList: {
    maxHeight: 180,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: '#E2E8F0',
  },
  relItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  relText: {
    fontSize: 14,
  },
  connectedBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 14,
  },
  connectedPrompt: {
    fontSize: 13,
    fontWeight: '700',
  },
  connectedPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  connectedPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  familyAddressPreview: {
    borderRadius: 10,
    padding: 14,
    marginTop: 14,
  },
  previewHeading: {
    fontSize: 13,
    fontWeight: '700',
  },
  previewText: {
    fontSize: 13,
    marginTop: 2,
  },
  areaPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  areaPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowTwo: {
    flexDirection: 'row',
  },
  bloodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  bloodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloodChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
