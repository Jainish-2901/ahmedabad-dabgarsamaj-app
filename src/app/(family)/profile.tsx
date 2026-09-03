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
import { membersService } from '@/features/members/membersService';
import { Area, Family, FamilyMember } from '@/types/database';
import { calculateAge, formatDate, isValidDOB } from '@/lib/utils/date';
import { PhotoUploadField } from '@/components/ui/PhotoUploadField';
import { imageService } from '@/lib/storage/imageService';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator';
import { LoadingState } from '@/components/ui/LoadingState';
import { TopBar } from '@/components/navigation/TopBar';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { Ionicons } from '@expo/vector-icons';

export default function HeadProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut, resetPassword, updatePasswordDirectly } = useAuth();
  const theme = useTheme();

  const [family, setFamily] = useState<Family | null>(null);
  const [headMember, setHeadMember] = useState<FamilyMember | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Direct Password Update states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Editable fields for head member
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [mobile, setMobile] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [areaId, setAreaId] = useState('');
  const [customAreaName, setCustomAreaName] = useState('');

  const loadData = async () => {
    const areaRes = await familyService.getAreas();
    setAreas(areaRes.data);

    const famRes = await familyService.getMyFamily();
    if (famRes.family) {
      setFamily(famRes.family);
      setAddress(famRes.family.address);
      setCity(famRes.family.city);
      setPincode(famRes.family.pincode);
      setAreaId(famRes.family.area_id || (areaRes.data[0]?.id || ''));

      const head = famRes.members.find((m) => m.relation === 'FAMILY_HEAD') || famRes.members[0];
      if (head) {
        setHeadMember(head);
        setName(head.name);
        setPhotoUrl(head.photo_url || null);
        setMobile(head.mobile || '');
        setDob(formatDate(head.dob));
        setGender((head.gender as any) || 'Male');
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProfile = async () => {
    if (!headMember || !family) return;
    if (!name.trim() || !dob.trim()) {
      Alert.alert('Validation Error', 'Name and Date of Birth are mandatory.');
      return;
    }

    if (!isValidDOB(dob.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid Date of Birth in DD-MM-YYYY format (e.g. 15-08-1985).');
      return;
    }

    setSaving(true);

    let finalPhotoUrl = photoUrl;
    if (photoUrl && photoBase64) {
      const uploadRes = await imageService.uploadMemberPhoto({
        uri: photoUrl,
        base64: photoBase64,
        familyId: family.id,
        headName: name,
        memberName: name,
      });
      finalPhotoUrl = uploadRes.url;
    }

    // Update Member Record
    await membersService.updateMember(headMember.id, {
      name: name.trim(),
      photo_url: finalPhotoUrl,
      mobile: mobile.trim() || null,
      dob: formatDate(dob.trim()),
      gender,
    });

    // Update Family Residence
    await familyService.updateFamily(family.id, {
      address: areaId === 'other' && customAreaName.trim() ? `${address.trim()} (${customAreaName.trim()})` : address.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      area_id: areaId !== 'other' ? areaId : null,
    });

    setSaving(false);
    setIsEditing(false);
    Alert.alert('Success', 'Profile and family address updated successfully!');
    loadData();
  };

  const handleDirectPasswordChange = async () => {
    setPasswordMsg(null);
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'નવો પાસવર્ડ ઓછામાં ઓછો ૬ અક્ષરનો હોવો જોઈએ.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'બંને પાસવર્ડ સરખા નથી. ફરીથી ચકાસો.' });
      return;
    }

    setUpdatingPassword(true);
    const res = await updatePasswordDirectly(newPassword);
    setUpdatingPassword(false);

    if (res.error) {
      setPasswordMsg({ type: 'error', text: res.error });
    } else {
      setPasswordMsg({ type: 'success', text: 'પાસવર્ડ સફળતાપૂર્વક બદલાઈ ગયો છે!' });
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Are you sure you want to log out of your family account?') : true;
      if (confirmed) {
        await signOut();
        router.replace('/(auth)/login' as any);
      }
      return;
    }

    Alert.alert('Log Out', 'Are you sure you want to log out of your family account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  };

  if (loading) {
    return <LoadingState message="Loading your profile..." />;
  }

  const selectedArea = areas.find((a) => a.id === areaId);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <TopBar title="My Profile / પ્રોફાઇલ" showBack rightAction={<View />} />

      <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.content}>
        {/* Profile Card Banner */}
        <Card style={styles.profileHeaderCard}>
          <Avatar
            name={headMember ? headMember.name : user?.email || 'User'}
            photoUrl={headMember?.photo_url}
            gender={headMember?.gender}
            size={76}
            enablePreview={true}
            subtitle="Family Head / પરિવારના વડા"
          />
          <Text style={[styles.profileName, { color: theme.text }]}>
            {headMember ? headMember.name : 'Family Head'}
          </Text>
          <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>
            {user?.email || 'Registered User'}
          </Text>
          <View style={styles.badgeRow}>
            <Badge label="Family Head / વડા" variant="primary" size="sm" />
            {family ? (
              <Badge
                label={family.family_code}
                variant="success"
                size="sm"
              />
            ) : null}
          </View>
        </Card>

        {/* Profile Form (View or Edit mode) */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {isEditing ? '✏️ Edit Profile Details' : '👤 Profile Details'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsEditing(!isEditing)}
              style={[styles.editToggleBtn, { backgroundColor: theme.primaryLight }]}
            >
              <Text style={[styles.editToggleText, { color: theme.primary }]}>
                {isEditing ? 'Cancel' : 'Edit / સુધારો'}
              </Text>
            </TouchableOpacity>
          </View>

          {isEditing ? (
            <View style={{ marginTop: 10 }}>
              {/* Head Profile Photo */}
              <PhotoUploadField
                label="Head Profile Photo / વડાનો ફોટો"
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
                value={name}
                onChangeText={setName}
              />
              <Input
                label="Mobile Number / મોબાઈલ નંબર"
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
                maxLength={10}
              />
              <Input
                label="Date of Birth / જન્મ તારીખ (DD-MM-YYYY) *"
                placeholder="e.g. 15-08-1985"
                value={dob}
                onChangeText={setDob}
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

              {/* Gender */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>Gender / જાતિ</Text>
                <View style={styles.gridRow}>
                  {(['Male', 'Female', 'Other'] as const).map((g) => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setGender(g)}
                      style={[
                        styles.choiceBtn,
                        {
                          backgroundColor: gender === g ? theme.primary : theme.backgroundElement,
                          borderColor: gender === g ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <Text style={[styles.choiceBtnText, { color: gender === g ? '#FFFFFF' : theme.text }]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Residence Address */}
              <Input
                label="Residence Address / સરનામું *"
                value={address}
                onChangeText={setAddress}
                multiline
              />

              {/* Area Selection */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>Area / વિસ્તાર</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                  {areas.map((a) => (
                    <TouchableOpacity
                      key={a.id}
                      onPress={() => setAreaId(a.id)}
                      style={[
                        styles.areaPill,
                        {
                          backgroundColor: areaId === a.id ? theme.primary : theme.backgroundElement,
                          borderColor: areaId === a.id ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <Text style={[styles.areaPillText, { color: areaId === a.id ? '#FFFFFF' : theme.text }]}>
                        {a.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {areaId === 'other' ? (
                  <Input
                    label="Enter Custom Area Name / વિસ્તારનું નામ લખો *"
                    placeholder="e.g. Isanpur / Chandlodia / Village name"
                    value={customAreaName}
                    onChangeText={setCustomAreaName}
                    style={{ marginTop: 10 }}
                  />
                ) : null}
              </View>

              <View style={styles.rowTwo}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Input label="City" value={city} onChangeText={setCity} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Input label="Pincode" value={pincode} onChangeText={setPincode} keyboardType="number-pad" />
                </View>
              </View>

              <Button
                title="Save Changes / ફેરફાર સાચવો"
                onPress={handleSaveProfile}
                loading={saving}
                size="lg"
                style={{ marginTop: 12 }}
              />
            </View>
          ) : (
            <View style={{ marginTop: 8 }}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Full Name:</Text>
                <Text style={[styles.infoVal, { color: theme.text }]}>{headMember?.name || 'N/A'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Gender / Age:</Text>
                <Text style={[styles.infoVal, { color: theme.text }]}>
                  {headMember?.gender} ({headMember?.age !== undefined ? `${headMember.age} yrs` : 'N/A'})
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Mobile:</Text>
                <Text style={[styles.infoVal, { color: theme.text }]}>
                  {headMember?.mobile ? `📞 ${headMember.mobile}` : 'Not provided'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>DOB & Age:</Text>
                <Text style={[styles.infoVal, { color: theme.text }]}>
                  {headMember?.dob ? `${formatDate(headMember.dob)} (${calculateAge(headMember.dob)} yrs / વર્ષ)` : 'N/A'}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Address:</Text>
                <Text style={[styles.infoVal, styles.addressVal, { color: theme.text }]}>{family?.address || 'N/A'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Area / City:</Text>
                <Text style={[styles.infoVal, { color: theme.text }]}>
                  {selectedArea?.name || family?.city} - {family?.pincode}
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Security & Direct Password Update */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            🔐 Change Password / નવો પાસવર્ડ સેટ કરો
          </Text>
          <Text style={[styles.securityDesc, { color: theme.textSecondary }]}>
            આપ સીધો અહીંથી નવો પાસવર્ડ દાખલ કરીને એપમાં જ અપડેટ કરી શકો છો.
          </Text>

          {passwordMsg ? (
            <View
              style={{
                backgroundColor: passwordMsg.type === 'success' ? theme.successLight : theme.errorLight,
                borderColor: passwordMsg.type === 'success' ? theme.success : theme.error,
                borderWidth: 1,
                borderRadius: 8,
                padding: 10,
                marginTop: 8,
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: passwordMsg.type === 'success' ? theme.success : theme.error,
                }}
              >
                {passwordMsg.text}
              </Text>
            </View>
          ) : null}

          <Input
            label="New Password / નવો પાસવર્ડ"
            placeholder="ઓછામાં ઓછા ૮ અક્ષર (Min 8 chars)"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            rightIcon={
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={{ padding: 4 }}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            }
          />

          {/* Live Password Strength Indicator & Suggestions */}
          <PasswordStrengthIndicator password={newPassword} />

          <Input
            label="Confirm New Password / નવો પાસવર્ડ ફરીથી નાખો"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            rightIcon={
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ padding: 4 }}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            }
          />

          <Button
            title="Update Password / પાસવર્ડ સેવ કરો"
            onPress={handleDirectPasswordChange}
            loading={updatingPassword}
            size="md"
            style={{ marginTop: 8 }}
          />
        </Card>

        {/* Log Out Button */}
        <Button
          title="Log Out / લોગ આઉટ કરો"
          variant="danger"
          onPress={handleLogout}
          size="lg"
          style={{ marginTop: 12, marginBottom: 20 }}
        />
      </ScrollView>

      <BottomTabBar />
    </KeyboardAvoidingView>
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
    padding: 16,
    paddingBottom: 30,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  profileHeaderCard: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  editToggleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  choiceBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  choiceBtnText: {
    fontSize: 13,
    fontWeight: '600',
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 7,
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    width: 95,
    flexShrink: 0,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  addressVal: {
    lineHeight: 18,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  securityDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
});
