import React, { useState } from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/constants/theme';
import { PhotoPreviewModal } from './PhotoPreviewModal';

export interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: number;
  gender?: string;
  subtitle?: string;
  enablePreview?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

export function Avatar({
  name,
  photoUrl,
  size = 48,
  gender,
  subtitle,
  enablePreview = false,
  onPress,
  style,
  imageStyle,
}: AvatarProps) {
  const theme = useTheme();
  const [imageError, setImageError] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  const getInitial = () => {
    if (!name) return '?';
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase();
  };

  const getFallbackBg = () => {
    if (gender === 'Female' || gender === 'FEMALE') return '#EC4899';
    if (gender === 'Male' || gender === 'MALE') return theme.primary;
    return '#6366F1';
  };

  const borderRadius = size / 2;

  const isValidPhoto = Boolean(
    photoUrl &&
    !imageError &&
    (photoUrl.startsWith('http') || photoUrl.startsWith('data:') || photoUrl.startsWith('blob:') || photoUrl.startsWith('file:') || photoUrl.startsWith('ph:'))
  );

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (enablePreview) {
      setPreviewVisible(true);
    }
  };

  const isTouchable = enablePreview || !!onPress;

  const renderContent = () => {
    if (isValidPhoto && photoUrl) {
      return (
        <View style={[{ width: size, height: size, borderRadius, overflow: 'hidden' }, style]}>
          <Image
            source={{ uri: photoUrl }}
            onError={() => setImageError(true)}
            style={[
              {
                width: size,
                height: size,
                borderRadius,
                backgroundColor: theme.backgroundElement,
              },
              imageStyle,
            ]}
          />
        </View>
      );
    }

    return (
      <View
        style={[
          styles.fallbackContainer,
          {
            width: size,
            height: size,
            borderRadius,
            backgroundColor: getFallbackBg(),
          },
          style,
        ]}
      >
        <Text style={[styles.initialText, { fontSize: size * 0.42 }]}>
          {getInitial()}
        </Text>
      </View>
    );
  };

  return (
    <>
      {isTouchable ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handlePress}
          style={{ width: size, height: size }}
        >
          {renderContent()}
        </TouchableOpacity>
      ) : (
        renderContent()
      )}

      {enablePreview ? (
        <PhotoPreviewModal
          visible={previewVisible}
          imageUri={isValidPhoto ? photoUrl : null}
          title={name}
          subtitle={subtitle}
          gender={gender}
          onClose={() => setPreviewVisible(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
