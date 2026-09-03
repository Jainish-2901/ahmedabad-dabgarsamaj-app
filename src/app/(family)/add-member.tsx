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
import { useRouter } from 'expo-router';
import { useTheme } from '@/constants/theme';
import { familyService } from '@/features/family/familyService';
import { membersService } from '@/features/members/membersService';
import { relationshipsService } from '@/features/tree/relationshipsService';
import { Area, Family, FamilyMember } from '@/types/database';
import { RELATIONSHIPS } from '@/constants/relationships';
import {
  EDUCATION_LEVELS,
  EDUCATION_STATUSES,
  getCoursesForLevel,
} from '@/constants/education';
import { OCCUPATIONS } from '@/constants/occupations';
import { calculateAge, formatAge, formatDate, isValidDOB } from '@/lib/utils/date';
import { PhotoUploadField } from '@/components/ui/PhotoUploadField';
import { imageService } from '@/lib/storage/imageService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { TopBar } from '@/components/navigation/TopBar';
import { Ionicons } from '@expo/vector-icons';

export default function AddMemberScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 5;

  // Family State
  const [family, setFamily] = useState<Family | null>(null);
  const [existingMembers, setExistingMembers] = useState<FamilyMember[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  // Step 1: Basic
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [isDeceased, setIsDeceased] = useState<boolean>(false);
  const [deceasedDate, setDeceasedDate] = useState<string>('');
  const [dob, setDob] = useState(''); // YYYY-MM-DD
  const [mobile, setMobile] = useState('');
  const [relation, setRelation] = useState('SON');
  const [relSearch, setRelSearch] = useState('');
  const [connectedMemberId, setConnectedMemberId] = useState<string>('');

  // Step 2: Education
  const [educationLevel, setEducationLevel] = useState('Undergraduate');
  const [courseOrStd, setCourseOrStd] = useState('BCA');
  const [customCourse, setCustomCourse] = useState('');
  const [eduStatus, setEduStatus] = useState<'Studying' | 'Completed' | 'Discontinued'>('Studying');
  const [passingYear, setPassingYear] = useState('');
  const [institution, setInstitution] = useState('');

  // Step 3: Occupation
  const [occupationType, setOccupationType] = useState('STUDENT');
  const [occupationDetails, setOccupationDetails] = useState<Record<string, string>>({});

  // Step 4: Residence
  const [residenceType, setResidenceType] = useState<'SAME_AS_FAMILY' | 'SEPARATE'>('SAME_AS_FAMILY');
  const [separateAddress, setSeparateAddress] = useState('');
  const [separateAreaId, setSeparateAreaId] = useState('');
  const [customSeparateArea, setCustomSeparateArea] = useState('');
  const [separateCity, setSeparateCity] = useState('Ahmedabad');
  const [separatePincode, setSeparatePincode] = useState('');

  // State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    familyService.getMyFamily().then((res) => {
      if (res.family) setFamily(res.family);
      if (res.members) {
        setExistingMembers(res.members);
        if (res.members.length > 0) {
          setConnectedMemberId(res.members[0].id);
        }
      }
    });
    familyService.getAreas().then((res) => {
      setAreas(res.data);
      if (res.data.length > 0) setSeparateAreaId(res.data[0].id);
    });
  }, []);

  const calculatedAge = calculateAge(dob);
  const selectedRel = RELATIONSHIPS.find((r) => r.code === relation);
  const availableCourses = getCoursesForLevel(educationLevel);

  // Filtered relationships by search
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

  const handleNext = () => {
    setErrorMessage('');
    if (currentStep === 1) {
      if (!name.trim()) {
        setErrorMessage('Please enter the member full name.');
        return;
      }
      if (!dob.trim() || !isValidDOB(dob.trim())) {
        setErrorMessage('Please enter valid Date of Birth in DD-MM-YYYY format (e.g. 20-05-2002).');
        return;
      }
      if (!relation) {
        setErrorMessage('Please select the relationship with Family Head.');
        return;
      }
    } else if (currentStep === 4) {
      if (residenceType === 'SEPARATE' && (!separateAddress.trim() || !separatePincode.trim())) {
        setErrorMessage('Please provide the separate residential address and pincode.');
        return;
      }
    }
    setCurrentStep((prev) => Math.min(totalSteps, prev + 1));
  };

  const handleBack = () => {
    setErrorMessage('');
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(family)/members' as any);
      }
    }
  };

  const handleSubmit = async () => {
    if (!family) {
      setErrorMessage('Family record not found.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    let finalPhotoUrl = photoUrl;
    if (photoUrl && (photoBase64 || photoUrl.startsWith('blob:') || photoUrl.startsWith('data:') || photoUrl.startsWith('file:'))) {
      const head = existingMembers.find((m) => m.relation === 'FAMILY_HEAD');
      const uploadRes = await imageService.uploadMemberPhoto({
        uri: photoUrl,
        base64: photoBase64,
        familyId: family.id,
        headName: head?.name || 'head',
        memberName: name,
      });
      finalPhotoUrl = uploadRes.url;
    }

    const finalCourse = courseOrStd.includes('Other') && customCourse.trim()
      ? customCourse.trim()
      : courseOrStd;

    const res = await membersService.addMember({
      family_id: family.id,
      name,
      photo_url: finalPhotoUrl,
      gender,
      dob: formatDate(dob.trim()),
      relation,
      mobile: mobile.trim() || undefined,
      residence_type: residenceType,
      separate_address: residenceType === 'SEPARATE' && separateAreaId === 'other' && customSeparateArea.trim()
        ? `${separateAddress.trim()} (${customSeparateArea.trim()})`
        : separateAddress,
      separate_area_id: separateAreaId !== 'other' ? separateAreaId : null,
      separate_city: separateCity,
      separate_pincode: separatePincode,
      education_level: educationLevel,
      course_or_standard: finalCourse,
      education_status: eduStatus,
      passing_year: passingYear ? parseInt(passingYear, 10) : undefined,
      institution,
      occupation_type: occupationType,
      occupation_details: occupationDetails,
      is_deceased: isDeceased,
      deceased_date: isDeceased && deceasedDate.trim() ? deceasedDate.trim() : null,
    });

    if (res.error) {
      setLoading(false);
      setErrorMessage(res.error);
      return;
    }

    // Automatically link relationship if connected member was chosen
    if (res.member && selectedRel && connectedMemberId) {
      if (selectedRel.connectType === 'spouse_of') {
        await relationshipsService.addRelationship(
          family.id,
          res.member.id,
          connectedMemberId,
          'SPOUSE'
        );
      } else if (selectedRel.connectType === 'child_of') {
        await relationshipsService.addRelationship(
          family.id,
          connectedMemberId,
          res.member.id,
          'PARENT'
        );
      } else if (selectedRel.connectType === 'parent_of') {
        await relationshipsService.addRelationship(
          family.id,
          res.member.id,
          connectedMemberId,
          'PARENT'
        );
      }
    }

    setLoading(false);

    Alert.alert(
      'Member Added Successfully!',
      `${name} has been added to your family directory and tree.`,
      [{ text: 'Done', onPress: () => router.replace('/(family)/home' as any) }]
    );
  };

  const selectedOcc = OCCUPATIONS.find((o) => o.code === occupationType);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <TopBar title="Add Family Member" showBack onBack={handleBack} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step Progress */}
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { color: theme.text }]}>
            Step {currentStep} of {totalSteps}
          </Text>
          <View style={styles.stepProgressBar}>
            {[1, 2, 3, 4, 5].map((s) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      s <= currentStep ? theme.primary : theme.backgroundElement,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {errorMessage ? (
          <View style={[styles.errorBanner, { backgroundColor: theme.errorLight, borderColor: theme.error }]}>
            <Text style={[styles.errorBannerText, { color: theme.error }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* STEP 1: Basic Details & Searchable Relationship */}
        {currentStep === 1 && (
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Step 1: Personal Details / વ્યક્તિગત માહિતી
            </Text>

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

            <Input
              label="Full Name / પૂરું નામ *"
              placeholder="e.g. Priya M. Dabgar"
              value={name}
              onChangeText={setName}
            />

            {/* Gender Selection */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Gender / જાતિ *</Text>
              <View style={styles.gridRow}>
                {(['Male', 'Female', 'Other'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    activeOpacity={0.7}
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
                      {g === 'Male' ? '👨 Male / પુરુષ' : g === 'Female' ? '👩 Female / સ્ત્રી' : g}
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
                  onPress={() => setIsDeceased(false)}
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
                  onPress={() => setIsDeceased(true)}
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
                label="Date / Year of Demise / સ્વર્ગવાસ તારીખ અથવા વર્ષ"
                placeholder="e.g. 15-08-2021 or 2021"
                value={deceasedDate}
                onChangeText={setDeceasedDate}
                helperText="પૂર્વજ / સ્વર્ગસ્થ સભ્ય માટે સ્વર્ગવાસ તારીખ અથવા વર્ષ દાખલ કરો"
              />
            ) : null}

            {/* DOB with Live Age */}
            <Input
              label="Date of Birth / જન્મ તારીખ (DD-MM-YYYY) *"
              placeholder="e.g. 20-05-2002"
              value={dob}
              onChangeText={setDob}
              helperText={
                formatAge(dob) !== 'N/A'
                  ? `Calculated Age: ${formatAge(dob)}`
                  : 'Enter DD-MM-YYYY to dynamically compute age'
              }
            />

            <Input
              label="Mobile Number / મોબાઈલ નંબર"
              placeholder="e.g. 9876543210"
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              maxLength={10}
            />

            {/* Searchable Relationship Picker (Req 5) */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>
                Relationship / સંબંધ *
              </Text>

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
                    activeOpacity={0.7}
                    onPress={() => {
                      setRelation(r.code);
                      // Pre-select head if not set
                      if (!connectedMemberId && existingMembers.length > 0) {
                        const head = existingMembers.find((m) => m.relation === 'FAMILY_HEAD');
                        setConnectedMemberId(head ? head.id : existingMembers[0].id);
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
                    <Text
                      style={[
                        styles.relText,
                        { color: relation === r.code ? theme.primary : theme.text },
                      ]}
                    >
                      {r.displayLabel}
                    </Text>
                    {relation === r.code ? (
                      <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Connected Person Selector (Req 2) */}
            {selectedRel && selectedRel.connectPrompt && existingMembers.length > 0 ? (
              <View style={[styles.connectedBox, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
                {(() => {
                  const connectedPerson = existingMembers.find((m) => m.id === connectedMemberId);
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
                  {existingMembers.map((m) => (
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
          </View>
        )}

        {/* STEP 2: Filtered Education with Other input (Req 4) */}
        {currentStep === 2 && (
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Step 2: Education Details / શિક્ષણ
            </Text>

            {/* Education Level Selection */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Education Level / સ્તર</Text>
              <View style={styles.gridWrap}>
                {EDUCATION_LEVELS.map((lvl) => (
                  <TouchableOpacity
                    key={lvl.value}
                    activeOpacity={0.7}
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
                    <Text
                      style={[
                        styles.gridChoiceText,
                        { color: educationLevel === lvl.value ? '#FFFFFF' : theme.text },
                      ]}
                    >
                      {lvl.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Courses / Standard Grid */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>
                Course / Degree / Standard ({educationLevel})
              </Text>
              <View style={styles.gridWrap}>
                {availableCourses.map((c) => (
                  <TouchableOpacity
                    key={c}
                    activeOpacity={0.7}
                    onPress={() => setCourseOrStd(c)}
                    style={[
                      styles.gridChoiceItem,
                      {
                        backgroundColor: courseOrStd === c ? theme.primary : theme.backgroundElement,
                        borderColor: courseOrStd === c ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.gridChoiceText,
                        { color: courseOrStd === c ? '#FFFFFF' : theme.text },
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Manual Course Input if Other (Req 4) */}
            {courseOrStd.includes('Other') ? (
              <Input
                label="Enter Custom Course / Degree Name *"
                placeholder="e.g. Master in Data Science / BCA Honours"
                value={customCourse}
                onChangeText={setCustomCourse}
              />
            ) : null}

            {/* Status Selection */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Status / સ્થિતિ</Text>
              <View style={styles.gridRow}>
                {EDUCATION_STATUSES.map((st) => (
                  <TouchableOpacity
                    key={st.value}
                    activeOpacity={0.7}
                    onPress={() => setEduStatus(st.value as any)}
                    style={[
                      styles.choiceButton,
                      {
                        backgroundColor: eduStatus === st.value ? theme.primary : theme.backgroundElement,
                        borderColor: eduStatus === st.value ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        { color: eduStatus === st.value ? '#FFFFFF' : theme.text },
                      ]}
                    >
                      {st.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Input
              label="Passing Year / પાસિંગ વર્ષ (Optional)"
              placeholder="e.g. 2024"
              value={passingYear}
              onChangeText={setPassingYear}
              keyboardType="number-pad"
              maxLength={4}
            />

            <Input
              label="School / College / University Name"
              placeholder="e.g. Gujarat University"
              value={institution}
              onChangeText={setInstitution}
            />
          </View>
        )}

        {/* STEP 3: Occupation with Dynamic Fields */}
        {currentStep === 3 && (
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Step 3: Occupation / વ્યવસાય
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Select Occupation Category</Text>
              <View style={styles.gridWrap}>
                {OCCUPATIONS.map((occ) => (
                  <TouchableOpacity
                    key={occ.code}
                    activeOpacity={0.7}
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
                    <Text
                      style={[
                        styles.gridChoiceText,
                        { color: occupationType === occ.code ? '#FFFFFF' : theme.text },
                      ]}
                    >
                      {occ.displayLabel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Dynamic Occupation Inputs */}
            {selectedOcc && selectedOcc.fields.length > 0 ? (
              <View style={styles.dynamicFieldsSection}>
                <Text style={[styles.dynamicHeading, { color: theme.primary }]}>
                  {selectedOcc.label} Details:
                </Text>
                {selectedOcc.fields.map((f) => (
                  <Input
                    key={f.key}
                    label={`${f.label}${f.required ? ' *' : ''}`}
                    placeholder={f.placeholder}
                    value={occupationDetails[f.key] || ''}
                    onChangeText={(val) =>
                      setOccupationDetails((prev) => ({ ...prev, [f.key]: val }))
                    }
                    keyboardType={f.type === 'number' ? 'number-pad' : 'default'}
                  />
                ))}
              </View>
            ) : null}
          </View>
        )}

        {/* STEP 4: Residence */}
        {currentStep === 4 && (
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Step 4: Residence / રહેઠાણ
            </Text>

            <View style={styles.gridRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setResidenceType('SAME_AS_FAMILY')}
                style={[
                  styles.choiceButton,
                  {
                    backgroundColor: residenceType === 'SAME_AS_FAMILY' ? theme.primary : theme.backgroundElement,
                    borderColor: residenceType === 'SAME_AS_FAMILY' ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    { color: residenceType === 'SAME_AS_FAMILY' ? '#FFFFFF' : theme.text },
                  ]}
                >
                  🏠 Same as Family
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setResidenceType('SEPARATE')}
                style={[
                  styles.choiceButton,
                  {
                    backgroundColor: residenceType === 'SEPARATE' ? theme.primary : theme.backgroundElement,
                    borderColor: residenceType === 'SEPARATE' ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    { color: residenceType === 'SEPARATE' ? '#FFFFFF' : theme.text },
                  ]}
                >
                  🏢 Living Separately
                </Text>
              </TouchableOpacity>
            </View>

            {residenceType === 'SAME_AS_FAMILY' ? (
              <View style={[styles.familyAddressPreview, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.previewHeading, { color: theme.text }]}>
                  Family Address:
                </Text>
                <Text style={[styles.previewText, { color: theme.textSecondary }]}>
                  {family?.address}
                </Text>
                <Text style={[styles.previewText, { color: theme.textSecondary }]}>
                  {family?.area?.name || family?.area_id || ''}, {family?.city} - {family?.pincode}
                </Text>
              </View>
            ) : (
              <View style={{ marginTop: 14 }}>
                <Input
                  label="Separate Address / સરનામું *"
                  placeholder="e.g. 45, Somnath Flats, Nikol"
                  value={separateAddress}
                  onChangeText={setSeparateAddress}
                  multiline
                />

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.text }]}>Area / વિસ્તાર</Text>
                  <View style={styles.gridWrap}>
                    {areas.map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        activeOpacity={0.7}
                        onPress={() => setSeparateAreaId(a.id)}
                        style={[
                          styles.gridChoiceItem,
                          {
                            backgroundColor: separateAreaId === a.id ? theme.primary : theme.backgroundElement,
                            borderColor: separateAreaId === a.id ? theme.primary : theme.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.gridChoiceText,
                            { color: separateAreaId === a.id ? '#FFFFFF' : theme.text },
                          ]}
                        >
                          {a.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {separateAreaId === 'other' ? (
                    <Input
                      label="Enter Custom Area Name / વિસ્તારનું નામ *"
                      placeholder="e.g. Isanpur / Chandlodia / Village name"
                      value={customSeparateArea}
                      onChangeText={setCustomSeparateArea}
                      style={{ marginTop: 10 }}
                    />
                  ) : null}
                </View>

                <View style={styles.rowTwo}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Input
                      label="City / શહેર"
                      value={separateCity}
                      onChangeText={setSeparateCity}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Input
                      label="Pincode / પીનકોડ *"
                      value={separatePincode}
                      onChangeText={setSeparatePincode}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* STEP 5: Review & Submit */}
        {currentStep === 5 && (
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Step 5: Review & Confirm / પુષ્ટિ કરો
            </Text>

            <Card style={styles.summaryCard}>
              <Text style={[styles.summaryName, { color: theme.text }]}>{name}</Text>
              <Text style={[styles.summaryRelation, { color: theme.primary }]}>
                {selectedRel?.displayLabel}
              </Text>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Gender:</Text>
                <Text style={[styles.summaryVal, { color: theme.text }]}>{gender}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>DOB / Age:</Text>
                <Text style={[styles.summaryVal, { color: theme.text }]}>
                  {dob} ({calculatedAge} yrs old)
                </Text>
              </View>

              {mobile ? (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Mobile:</Text>
                  <Text style={[styles.summaryVal, { color: theme.text }]}>{mobile}</Text>
                </View>
              ) : null}

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Education:</Text>
                <Text style={[styles.summaryVal, { color: theme.text }]}>
                  {courseOrStd.includes('Other') && customCourse ? customCourse : courseOrStd} ({eduStatus})
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Occupation:</Text>
                <Text style={[styles.summaryVal, { color: theme.text }]}>
                  {selectedOcc?.label}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Residence:</Text>
                <Text style={[styles.summaryVal, { color: theme.text }]}>
                  {residenceType === 'SAME_AS_FAMILY' ? 'Same as family address' : `Separate (${separateCity})`}
                </Text>
              </View>
            </Card>

            <Button
              title="Save Family Member / સભ્ય ઉમેરો"
              onPress={handleSubmit}
              loading={loading}
              size="lg"
              style={{ marginTop: 8 }}
            />
          </View>
        )}

        {/* Bottom Navigation */}
        {currentStep < 5 && (
          <View style={styles.bottomNav}>
            <Button
              title="Next Step →"
              onPress={handleNext}
              size="lg"
              style={{ width: '100%' }}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  stepHeader: {
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepProgressBar: {
    flexDirection: 'row',
    gap: 6,
  },
  stepDot: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  formCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    elevation: 2,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
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
    justifyContent: 'center',
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
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
    maxHeight: 200,
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
    fontWeight: '500',
  },
  connectedBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
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
  dynamicFieldsSection: {
    marginTop: 12,
  },
  dynamicHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  familyAddressPreview: {
    marginTop: 14,
    padding: 14,
    borderRadius: 10,
  },
  previewHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 13,
  },
  rowTwo: {
    flexDirection: 'row',
  },
  summaryCard: {
    padding: 16,
    marginBottom: 16,
  },
  summaryName: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryRelation: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  bottomNav: {
    marginTop: 16,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
