import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/constants/theme';
import { imageService } from '@/lib/storage/imageService';
import { Avatar } from './Avatar';
import { Ionicons } from '@expo/vector-icons';

export interface PhotoUploadFieldProps {
  label?: string;
  name: string;
  gender?: string;
  photoUrl?: string | null;
  onPhotoSelected: (uri: string, base64?: string) => void;
  onPhotoRemoved?: () => void;
  size?: number;
}

export function PhotoUploadField({
  label = 'Profile Photo / પ્રોફાઇલ ફોટો',
  name,
  gender,
  photoUrl,
  onPhotoSelected,
  onPhotoRemoved,
  size = 80,
}: PhotoUploadFieldProps) {
  const theme = useTheme();

  const handlePickPhoto = async () => {
    const res = await imageService.pickProfilePhoto();
    if (res.uri) {
      onPhotoSelected(res.uri, res.base64);
    }
  };

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      ) : null}

      <View style={styles.avatarRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handlePickPhoto}
          style={styles.avatarWrapper}
        >
          <Avatar
            name={name || 'User'}
            photoUrl={photoUrl}
            gender={gender}
            size={size}
          />
          <View
            style={[
              styles.cameraBadge,
              {
                backgroundColor: theme.primary,
                borderColor: theme.card,
              },
            ]}
          >
            <Ionicons name="camera" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePickPhoto}
            style={[styles.pickBtn, { backgroundColor: theme.primaryLight }]}
          >
            <Ionicons name="cloud-upload-outline" size={16} color={theme.primary} />
            <Text style={[styles.pickBtnText, { color: theme.primary }]}>
              {photoUrl ? 'Change Photo / ફોટો બદલો' : 'Upload Photo / ફોટો અપલોડ કરો'}
            </Text>
          </TouchableOpacity>

          {photoUrl && onPhotoRemoved ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onPhotoRemoved}
              style={styles.removeBtn}
            >
              <Text style={[styles.removeBtnText, { color: theme.error }]}>
                Remove Photo / ફોટો દૂર કરો
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    elevation: 3,
  },
  actionButtons: {
    flex: 1,
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  pickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  removeBtn: {
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
