import { Alert, Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export async function exportTreeAsImage(
  viewShotRef: React.RefObject<any>,
  fileName: string = 'community-family-tree'
): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      const { toPng } = await import('html-to-image');
      const targetElement = viewShotRef.current;
      if (!targetElement) {
        Alert.alert('Export Error', 'Tree element not found on page.');
        return;
      }

      // If viewShotRef points to React Native Web component ref, find its DOM node
      const domNode = (targetElement as any)._touchableNode ||
                      (targetElement as any).node ||
                      (typeof targetElement.querySelector === 'function' ? targetElement : null) ||
                      document.getElementById('family-tree-capture-root') ||
                      targetElement;

      const dataUrl = await toPng(domNode, {
        quality: 0.95,
        backgroundColor: '#F8FAFC',
        pixelRatio: 2,
      });

      const downloadLink = document.createElement('a');
      downloadLink.download = `${fileName}.png`;
      downloadLink.href = dataUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      return;
    }

    // Native Mobile (Android / iOS)
    if (!viewShotRef.current) return;
    const uri = await captureRef(viewShotRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    if (uri) {
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Family Tree Image`,
          UTI: 'public.png',
        });
      } else {
        Alert.alert('Export Tree', `Tree image ready at: ${uri}`);
      }
    }
  } catch (err: any) {
    console.warn('Export tree error:', err);
    if (Platform.OS === 'web') {
      // Direct Web canvas fallback
      try {
        const target = document.getElementById('family-tree-capture-root');
        if (target) {
          const { toPng } = await import('html-to-image');
          const dataUrl = await toPng(target, { quality: 0.95, backgroundColor: '#F8FAFC' });
          const link = document.createElement('a');
          link.download = `${fileName}.png`;
          link.href = dataUrl;
          link.click();
          return;
        }
      } catch {}
    }
    Alert.alert('Export Tree', 'Unable to capture tree image. Please try again.');
  }
}
