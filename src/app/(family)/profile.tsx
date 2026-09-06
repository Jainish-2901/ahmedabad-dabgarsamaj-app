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
import { useRouter } from 'expo-router';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/constants/theme';
import { familyService } from '@/features/family/familyService';
import { membersService } from '@/features/members/membersService';
import { Family, FamilyMember } from '@/types/database';
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

  // Danger Zone - Account Deletion state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Editable fields for head member
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [mobile, setMobile] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  const loadData = async () => {
    if (!user?.id) {
      setFamily(null);
      setHeadMember(null);
      setLoading(false);
      return;
    }

    const famRes = await familyService.getMyFamily(user.id);
    if (famRes.family) {
      setFamily(famRes.family);
      setAddress(famRes.family.address);
      setCity(famRes.family.city);
      setPincode(famRes.family.pincode);

      const head = famRes.members.find((m) => m.relation === 'FAMILY_HEAD') || famRes.members[0];
      if (head) {
        setHeadMember(head);
        setName(head.name);
        setPhotoUrl(head.photo_url || null);
        setMobile(head.mobile || '');
        setDob(formatDate(head.dob));
        setGender((head.gender as any) || 'Male');
      }
    } else {
      setFamily(null);
      setHeadMember(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

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
      address: address.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      area_id: null,
    });

    setSaving(false);
    setIsEditing(false);
    Alert.alert('Success / સફળતા', 'પ્રોફાઇલ વિગતો સફળતાપૂર્વક અપડેટ થઈ છે!');
    loadData();
  };

  const handleSaveFamilyAddress = async () => {
    if (!family) return;
    if (!address.trim()) {
      Alert.alert('Validation Error', 'કૃપા કરીને ઘર / ફ્લેટ / સોસાયટીનું સરનામું દાખલ કરો.');
      return;
    }
    if (!pincode.trim() || pincode.trim().length !== 6) {
      Alert.alert('Validation Error', 'કૃપા કરીને માન્ય ૬ આંકડાનો પીનકોડ દાખલ કરો.');
      return;
    }

    setSavingAddress(true);
    const res = await familyService.updateFamily(family.id, {
      address: address.trim(),
      city: city.trim() || 'Ahmedabad',
      pincode: pincode.trim(),
    });
    setSavingAddress(false);

    if (res.error) {
      Alert.alert('Error', res.error);
    } else {
      setIsEditingAddress(false);
      Alert.alert('Success / સફળતા', 'પરિવારનું વર્તમાન સરનામું સફળતાપૂર્વક અપડેટ થયું છે!');
      loadData();
    }
  };

  const handleDirectPasswordChange = async () => {
    setPasswordMsg(null);
    if (!newPassword || newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'નવો પાસવર્ડ ઓછામાં ઓછો ૮ અક્ષરનો હોવો જોઈએ.' });
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

  const handleDeleteFamilyAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      Alert.alert('અમાન્ય પુષ્ટિ', 'કૃપા કરીને ખાતરી કરવા માટે બોક્સમાં DELETE લખો.');
      return;
    }

    setDeleting(true);
    try {
      const res = await familyService.deleteFamilyAccount(family?.id, user?.id);
      if (res.error) {
        Alert.alert('Error', res.error);
        setDeleting(false);
        return;
      }

      await signOut();
      setDeleteModalVisible(false);

      if (Platform.OS === 'web') {
        alert('તમારો પરિવાર અને એકાઉન્ટ સફળતાપૂર્વક કાયમ માટે ડિલીટ કરવામાં આવ્યા છે.');
      } else {
        Alert.alert('એકાઉન્ટ ડિલીટ થયું', 'તમારો પરિવાર અને એકાઉન્ટ સફળતાપૂર્વક કાયમ માટે ડિલીટ કરવામાં આવ્યા છે.');
      }

      router.replace('/(auth)/login' as any);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to delete family account');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading your profile..." />;
  }

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
                  {(['Male', 'Female'] as const).map((g) => (
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
                        {g === 'Male' ? '👨 Male / પુરુષ' : '👩 Female / સ્ત્રી'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Button
                title="Save Profile / પ્રોફાઇલ સાચવો"
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
            </View>
          )}
        </Card>

        {/* Dedicated Family Current Address Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="home" size={20} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>
                🏠 Family Address / પરિવારનું સરનામું
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsEditingAddress(!isEditingAddress)}
              style={[styles.editToggleBtn, { backgroundColor: theme.primaryLight }]}
            >
              <Text style={[styles.editToggleText, { color: theme.primary }]}>
                {isEditingAddress ? 'Cancel' : 'Edit / સરનામું બદલો ✏️'}
              </Text>
            </TouchableOpacity>
          </View>

          {isEditingAddress ? (
            <View style={{ marginTop: 12 }}>
              <Input
                label="House / Flat / Society Address / ઘરનું સરનામું *"
                placeholder="e.g. 757/1, Chhipa pole, Swaminarayan Mandir Road, Kalupur"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
              />
              <View style={styles.rowTwo}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Input label="City / શહેર" value={city} onChangeText={setCity} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Input
                    label="Pincode / પીનકોડ *"
                    placeholder="380001"
                    value={pincode}
                    onChangeText={setPincode}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>
              <Button
                title="Save Address / સરનામું સાચવો"
                onPress={handleSaveFamilyAddress}
                loading={savingAddress}
                size="lg"
                style={{ marginTop: 14 }}
              />
            </View>
          ) : (
            <View style={{ marginTop: 10 }}>
              <View style={{ backgroundColor: theme.backgroundElement, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: theme.border }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text, lineHeight: 22 }}>
                  {family?.address || 'સરનામું નોંધાયેલ નથી'}
                </Text>
                <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 6, fontWeight: '600' }}>
                  📍 {family?.city || 'Ahmedabad'}{family?.pincode ? ` - ${family.pincode}` : ''}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 8 }}>
                ℹ️ પરિવારના વડા અથવા એડિટ પરવાનગી ધરાવતા સભ્યો અહીંથી સરનામું ગમે ત્યારે અપડેટ કરી શકે છે.
              </Text>
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
          variant="outline"
          onPress={handleLogout}
          size="lg"
          style={{ marginTop: 12, marginBottom: 14 }}
        />

        {/* Danger Zone: Delete Family & Account */}
        <Card style={[styles.dangerCard, { borderColor: theme.error, backgroundColor: theme.card }]}>
          <View style={styles.dangerHeader}>
            <View style={[styles.dangerIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="warning" size={20} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dangerTitle, { color: theme.error }]}>
                ભયજનક ઝોન / Danger Zone
              </Text>
              <Text style={[styles.dangerSubtitle, { color: theme.text }]}>
                Delete Family & Account / આખો પરિવાર અને એકાઉન્ટ ડિલીટ કરો
              </Text>
            </View>
          </View>
          <Text style={[styles.dangerDesc, { color: theme.textSecondary }]}>
            આ વિકલ્પ પસંદ કરવાથી તમારા પરિવારના તમામ સભ્યો, વંશાવલી, ફોટા અને તમારું એકાઉન્ટ કાયમ માટે હંમેશને માટે નાશ પામશે. આ ક્રિયા ક્યારેય પાછી (Undo) કરી શકાશે નહીં.
          </Text>
          <Button
            title="Delete Account & Family / પરિવાર ડિલીટ કરો"
            variant="danger"
            onPress={() => {
              setDeleteConfirmText('');
              setDeleteModalVisible(true);
            }}
            size="md"
            style={{ marginTop: 12 }}
          />
        </Card>
      </ScrollView>

      {/* Permanent Account Deletion Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !deleting && setDeleteModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => !deleting && setDeleteModalVisible(false)}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[styles.deleteModalCard, { backgroundColor: theme.card, borderColor: theme.error }]}
          >
            <View style={styles.deleteModalHeader}>
              <View style={[styles.deleteModalIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="trash" size={24} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.deleteModalTitle, { color: theme.error }]}>
                  કાયમી એકાઉન્ટ રદ્દીકરણ
                </Text>
                <Text style={[styles.deleteModalSub, { color: theme.textSecondary }]}>
                  Permanent Account & Family Deletion
                </Text>
              </View>
              <TouchableOpacity
                disabled={deleting}
                onPress={() => setDeleteModalVisible(false)}
                style={[styles.closeModalBtn, { backgroundColor: theme.backgroundElement }]}
              >
                <Ionicons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.deleteWarningBox, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
              <Text style={styles.deleteWarningText}>
                ⚠️ <Text style={{ fontWeight: '800' }}>ધ્યાન આપો:</Text> આ ક્રિયા રિવર્સ (Undo) કરી શકાશે નહીં.
              </Text>
              <Text style={styles.deleteWarningBullet}>
                • તમારા પરિવારના તમામ સભ્યો ({family?.family_code}) કાયમ માટે ભૂંસાઈ જશે.
              </Text>
              <Text style={styles.deleteWarningBullet}>
                • ડિજિટલ પુસ્તિકામાંથી આપનું ફેમિલી કાર્ડ હટાવી દેવામાં આવશે.
              </Text>
              <Text style={styles.deleteWarningBullet}>
                • તમામ ફોટા, શિક્ષણ અને વ્યવસાયનો રેકોર્ડ ડિલીટ થઈ જશે.
              </Text>
            </View>

            <Text style={[styles.confirmPromptText, { color: theme.text }]}>
              પુષ્ટિ કરવા માટે નીચે બોક્સમાં <Text style={{ color: '#DC2626', fontWeight: '800' }}>DELETE</Text> લખો:
            </Text>

            <Input
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="અહીં DELETE લખો"
              autoCapitalize="characters"
              autoCorrect={false}
              style={{ marginTop: 6 }}
            />

            <View style={styles.modalActionButtonsRow}>
              <Button
                title="Cancel / રદ કરો"
                variant="outline"
                disabled={deleting}
                onPress={() => setDeleteModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Delete Forever"
                variant="danger"
                loading={deleting}
                disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                onPress={handleDeleteFamilyAccount}
                style={{ flex: 1 }}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
  dangerCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 24,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  dangerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dangerSubtitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  dangerDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 30px rgba(220, 38, 38, 0.2)',
      },
      default: {
        elevation: 8,
      },
    }),
  },
  deleteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  deleteModalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  deleteModalSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteWarningBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
    gap: 6,
  },
  deleteWarningText: {
    fontSize: 13,
    color: '#991B1B',
  },
  deleteWarningBullet: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 17,
  },
  confirmPromptText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalActionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
});
