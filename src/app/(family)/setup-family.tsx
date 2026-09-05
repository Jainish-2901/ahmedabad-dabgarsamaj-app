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
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/constants/theme';
import { familyService } from '@/features/family/familyService';
import { calculateAge, formatDate, isValidDOB } from '@/lib/utils/date';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OCCUPATIONS } from '@/constants/occupations';
import { TopBar } from '@/components/navigation/TopBar';
import { PhotoUploadField } from '@/components/ui/PhotoUploadField';
import { imageService } from '@/lib/storage/imageService';
import { Ionicons } from '@expo/vector-icons';

export default function SetupFamilyScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const theme = useTheme();

  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say'>('Male');
  const [dob, setDob] = useState(''); // YYYY-MM-DD
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Ahmedabad');
  const [state, setState] = useState('Gujarat');
  const [pincode, setPincode] = useState('');
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [birthPlace, setBirthPlace] = useState<string>('');
  const [occupationType, setOccupationType] = useState('BUSINESS_OWNER');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Auto-fill mobile number from signup / user profile
    const userPhone = profile?.phone || user?.phone || (user?.user_metadata?.phone as string) || '';
    if (userPhone && !mobile) {
      setMobile(userPhone);
    }
  }, [profile, user]);

  const handleCreateFamily = async () => {
    setErrorMessage('');
    if (!name.trim() || !dob.trim() || !mobile.trim() || !address.trim() || !pincode.trim()) {
      setErrorMessage('Please fill in all mandatory fields marked with *');
      return;
    }

    // Basic date format validation (DD-MM-YYYY or YYYY-MM-DD)
    if (!isValidDOB(dob.trim())) {
      setErrorMessage('Please enter a valid Date of Birth in DD-MM-YYYY format (e.g. 15-08-1985).');
      return;
    }

    setLoading(true);

    let finalPhotoUrl = photoUrl;
    if (photoUrl && (photoBase64 || photoUrl.startsWith('blob:') || photoUrl.startsWith('data:') || photoUrl.startsWith('file:'))) {
      const uploadRes = await imageService.uploadMemberPhoto({
        uri: photoUrl,
        base64: photoBase64,
        headName: name,
        memberName: name,
      });
      finalPhotoUrl = uploadRes.url;
    }

    const res = await familyService.createFamilyWithHead({
      head_user_id: user?.id,
      name,
      gender,
      photo_url: finalPhotoUrl,
      dob: formatDate(dob.trim()),
      mobile: mobile.trim(),
      address: address.trim(),
      area_id: null,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      occupation_type: occupationType,
      blood_group: bloodGroup.trim() || null,
      birth_place: birthPlace.trim() || null,
    });
    setLoading(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else {
      Alert.alert(
        'Family Created!',
        `Your family code is ${res.family?.family_code}. You can now start adding family members.`,
        [{ text: 'Continue', onPress: () => router.replace('/(family)/home' as any) }]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <TopBar title="Family Setup / પરિવાર નોંધણી" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            Family Setup / પરિવાર નોંધણી
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Enter the details of the Family Head and primary residence.
          </Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {errorMessage ? (
            <View style={[styles.errorBanner, { backgroundColor: theme.errorLight, borderColor: theme.error }]}>
              <Text style={[styles.errorBannerText, { color: theme.error }]}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.sectionHeading, { color: theme.primary }]}>
            1. Family Head Details / વડાની વિગત
          </Text>

          {/* Head Profile Photo */}
          <PhotoUploadField
            label="Family Head Photo / વડાનો ફોટો"
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
            placeholder="e.g. Maheshbhai K. Dabgar"
            value={name}
            onChangeText={setName}
          />

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>
              Gender / જાતિ *
            </Text>
            <View style={styles.pillRow}>
              {(['Male', 'Female', 'Other'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  activeOpacity={0.7}
                  onPress={() => setGender(g)}
                  style={[
                    styles.pillButton,
                    {
                      backgroundColor:
                        gender === g ? theme.primary : theme.backgroundElement,
                      borderColor:
                        gender === g ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: gender === g ? '#FFFFFF' : theme.text },
                    ]}
                  >
                    {g === 'Male' ? 'Male / પુરુષ' : g === 'Female' ? 'Female / સ્ત્રી' : g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Input
            label="Date of Birth / જન્મ તારીખ (DD-MM-YYYY) *"
            placeholder="e.g. 15-08-1985"
            value={dob}
            onChangeText={setDob}
            helperText="DOB (DD-MM-YYYY) is used to automatically calculate current age."
          />

          {isValidDOB(dob.trim()) ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.primaryLight,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                marginBottom: 14,
                marginTop: -6,
                borderWidth: 1,
                borderColor: theme.primary,
                gap: 6,
              }}
            >
              <Ionicons name="sparkles" size={15} color={theme.primary} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary }}>
                ઉંમર (Current Age): {calculateAge(dob.trim())} વર્ષ ({calculateAge(dob.trim())} yrs)
              </Text>
            </View>
          ) : null}

          <Input
            label="Mobile Number / મોબાઈલ નંબર *"
            placeholder="e.g. 9876543210"
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            maxLength={10}
          />

          {/* Blood Group */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>
              Blood Group / બ્લડ ગ્રૂપ
            </Text>
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
            helperText="પરિવારના વડાનું મૂળ ગામ અથવા જન્મ સ્થળ"
          />

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>
              Primary Occupation / વ્યવસાય
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalPills}>
              {OCCUPATIONS.slice(0, 6).map((occ) => (
                <TouchableOpacity
                  key={occ.code}
                  activeOpacity={0.7}
                  onPress={() => setOccupationType(occ.code)}
                  style={[
                    styles.pillButton,
                    {
                      backgroundColor:
                        occupationType === occ.code ? theme.primary : theme.backgroundElement,
                      borderColor:
                        occupationType === occ.code ? theme.primary : theme.border,
                      marginRight: 8,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: occupationType === occ.code ? '#FFFFFF' : theme.text },
                    ]}
                  >
                    {occ.displayLabel}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Text style={[styles.sectionHeading, { color: theme.primary, marginTop: 16 }]}>
            2. Family Residence Address / સરનામું
          </Text>

          <Input
            label="House / Flat / Society Address *"
            placeholder="e.g. 12, Shree Ram Society, Near Main Circle"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={2}
          />

          <View style={styles.rowTwo}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Input
                label="City / શહેર *"
                placeholder="Ahmedabad"
                value={city}
                onChangeText={setCity}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Input
                label="Pincode / પીનકોડ *"
                placeholder="382350"
                value={pincode}
                onChangeText={setPincode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
          </View>

          <Button
            title="Complete Family Registration / નોંધણી પૂર્ણ કરો"
            onPress={handleCreateFamily}
            loading={loading}
            size="lg"
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    elevation: 3,
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)',
  },
  sectionHeading: {
    fontSize: 16,
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
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  horizontalPills: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  pillButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowTwo: {
    flexDirection: 'row',
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
  submitButton: {
    marginTop: 16,
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
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloodChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
