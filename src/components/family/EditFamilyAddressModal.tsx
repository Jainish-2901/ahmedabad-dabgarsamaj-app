import React, { useState, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { familyService } from '@/features/family/familyService';
import { Family } from '@/types/database';

export interface EditFamilyAddressModalProps {
  visible: boolean;
  family: Family | null;
  onClose: () => void;
  onSuccess: (updatedFamily: Family) => void;
}

export function EditFamilyAddressModal({
  visible,
  family,
  onClose,
  onSuccess,
}: EditFamilyAddressModalProps) {
  const theme = useTheme();

  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Ahmedabad');
  const [pincode, setPincode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (family) {
      setAddress(family.address || '');
      setCity(family.city || 'Ahmedabad');
      setPincode(family.pincode || '');
      setError('');
    }
  }, [family, visible]);

  const handleSave = async () => {
    if (!family) return;
    setError('');

    if (!address.trim()) {
      setError('કૃપા કરીને ઘર / ફ્લેટ / સોસાયટીનું સરનામું દાખલ કરો.');
      return;
    }

    if (!pincode.trim() || pincode.trim().length !== 6) {
      setError('કૃપા કરીને માન્ય ૬ આંકડાનો પીનકોડ દાખલ કરો.');
      return;
    }

    setSaving(true);
    try {
      const res = await familyService.updateFamily(family.id, {
        address: address.trim(),
        city: city.trim() || 'Ahmedabad',
        pincode: pincode.trim(),
      });

      setSaving(false);

      if (res.error) {
        setError(res.error);
        Alert.alert('Error', res.error);
        return;
      }

      if (res.family) {
        onSuccess(res.family);
        Alert.alert('Success / સફળતા', 'પરિવારનું વર્તમાન સરનામું સફળતાપૂર્વક અપડેટ થયું છે!');
        onClose();
      }
    } catch (err: any) {
      setSaving(false);
      setError(err?.message || 'Failed to update address');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={[styles.iconCircle, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="home" size={24} color={theme.primary} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                પરિવારનું સરનામું બદલો
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Update Family Residence Address
              </Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: theme.errorLight, borderColor: theme.error }]}>
                <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
              </View>
            ) : null}

            {/* Form Fields */}
            <View style={styles.formSection}>
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
                  <Input
                    label="City / શહેર"
                    value={city}
                    onChangeText={setCity}
                  />
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
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <Button
                title="રદ કરો / Cancel"
                variant="outline"
                onPress={onClose}
                disabled={saving}
                style={{ flex: 1 }}
              />
              <Button
                title="સરનામું સાચવો / Save"
                variant="primary"
                onPress={handleSave}
                loading={saving}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 460,
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
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  formSection: {
    marginTop: 4,
  },
  rowTwo: {
    flexDirection: 'row',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
});
