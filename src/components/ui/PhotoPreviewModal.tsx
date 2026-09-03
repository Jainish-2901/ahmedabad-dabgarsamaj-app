import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export interface PhotoPreviewModalProps {
  visible: boolean;
  imageUri?: string | number | null;
  title?: string;
  subtitle?: string;
  gender?: string;
  onClose: () => void;
}

export function PhotoPreviewModal({
  visible,
  imageUri,
  title,
  subtitle,
  gender,
  onClose,
}: PhotoPreviewModalProps) {
  const theme = useTheme();

  if (!visible) return null;

  const isImageValid = !!imageUri && typeof imageUri === 'string' && imageUri.trim().length > 0;
  const isImageResource = typeof imageUri === 'number';

  const defaultAvatarEmoji = gender === 'FEMALE' ? '👩' : '👨';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          {/* Header with Title & Close Button */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              {title ? (
                <Text numberOfLines={1} style={[styles.modalTitleText, { color: theme.text }]}>
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text numberOfLines={1} style={[styles.modalSubtitleText, { color: theme.primary }]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={[styles.modalCloseBtn, { backgroundColor: theme.backgroundElement }]}
              accessibilityLabel="Close photo"
            >
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Centered Image Frame */}
          <View style={[styles.modalImageWrapper, { backgroundColor: theme.backgroundElement }]}>
            {isImageValid ? (
              <Image
                source={{ uri: imageUri as string }}
                style={styles.modalImage}
                resizeMode="cover"
              />
            ) : isImageResource ? (
              <Image
                source={imageUri as ImageSourcePropType}
                style={styles.modalImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderEmoji}>{defaultAvatarEmoji}</Text>
                <Text style={[styles.noPhotoText, { color: theme.textSecondary }]}>
                  ફોટો ઉપલબ્ધ નથી / No Photo
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.25)',
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  modalHeaderLeft: {
    flex: 1,
    marginRight: 10,
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitleText: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImageWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  noPhotoText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
