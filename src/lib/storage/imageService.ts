import * as ImagePicker from 'expo-image-picker';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';

export interface UploadMemberPhotoParams {
  uri: string;
  base64?: string | null;
  familyId?: string;
  headName?: string;
  memberName: string;
}

export const imageService = {
  /**
   * Request media library permissions (on Native) and pick a 1:1 square profile picture
   */
  async pickProfilePhoto(): Promise<{ uri?: string; base64?: string; error?: string }> {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          return { error: 'Permission to access gallery is required to upload photos.' };
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return {};
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        base64: asset.base64 || undefined,
      };
    } catch (err: any) {
      return { error: err?.message || 'Failed to select image' };
    }
  },

  /**
   * Upload photo to Supabase Storage bucket: member-photos
   * File path pattern: {familyId}/{headName}_{memberName}_avatar.jpg
   */
  async uploadMemberPhoto(params: UploadMemberPhotoParams): Promise<{ url: string; error?: string }> {
    const { uri, base64, familyId = 'general', headName = 'head', memberName } = params;

    if (!isSupabaseConfigured || !uri) {
      return { url: uri };
    }

    try {
      const cleanHead = headName.trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const cleanMember = memberName.trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const fileName = `${cleanHead}_${cleanMember}_avatar.jpg`;
      const filePath = `${familyId}/${fileName}`;

      let uploadBody: any;
      let contentType = 'image/jpeg';

      if (base64) {
        uploadBody = decode(base64);
      } else if (uri.startsWith('data:')) {
        const parts = uri.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        if (mimeMatch) contentType = mimeMatch[1];
        uploadBody = decode(parts[1]);
      } else {
        // Fetch blob from URI (works on Web blob URLs and local URIs)
        const response = await fetch(uri);
        const blob = await response.blob();
        uploadBody = blob;
        if (blob.type) contentType = blob.type;
      }

      const { data, error } = await supabase.storage
        .from('member-photos')
        .upload(filePath, uploadBody, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.error('Supabase photo upload error:', error.message);
        return { url: uri, error: error.message };
      }

      const { data: publicUrlData } = supabase.storage
        .from('member-photos')
        .getPublicUrl(data.path);

      // Add cache-busting timestamp query so Web browser always displays newest uploaded image
      const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      return { url: publicUrl };
    } catch (err: any) {
      console.error('Upload catch error:', err);
      return { url: uri, error: err?.message || 'Failed to upload photo' };
    }
  },
};
