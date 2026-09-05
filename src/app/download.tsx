import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useTheme } from '@/constants/theme';
import { TopBar } from '@/components/navigation/TopBar';
import { Card } from '@/components/ui/Card';
import { Ionicons } from '@expo/vector-icons';

export default function DownloadAppScreen() {
  const router = useRouter();
  const theme = useTheme();
  const appVersion = Constants.expoConfig?.version || '1.0.3';

  // State for PWA install prompt & status
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);

  // APK download URL: Set via .env EXPO_PUBLIC_APK_URL or direct file in public/ahmedabad-dabgarsamaj.apk
  const APK_DOWNLOAD_URL =
    process.env.EXPO_PUBLIC_APK_URL || '/ahmedabad-dabgarsamaj.apk';
  const APK_FILE_NAME = 'Ahmedabad-Dabgar-Samaj.apk';

  useEffect(() => {
    if (Platform.OS !== 'web') {
      router.replace('/(family)/about' as any);
      return;
    }

    // Detect if running on iOS (iPhone / iPad / iPod)
    if (typeof window !== 'undefined' && window.navigator) {
      const userAgent = window.navigator.userAgent || '';
      const isIos =
        /iPad|iPhone|iPod/.test(userAgent) ||
        (window.navigator.platform === 'MacIntel' &&
          window.navigator.maxTouchPoints > 1);
      setIsIosDevice(isIos);

      // Check if running in standalone (installed PWA) mode
      const isInstalled =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isInstalled);
    }

    // Capture standard PWA install prompt (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDownloadAndroid = () => {
    if (Platform.OS === 'web') {
      try {
        const link = document.createElement('a');
        link.href = APK_DOWNLOAD_URL;
        link.setAttribute('download', APK_FILE_NAME);
        link.setAttribute('target', '_blank');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        window.open(APK_DOWNLOAD_URL, '_blank');
      }
    } else {
      Linking.openURL(APK_DOWNLOAD_URL).catch(() => {
        Alert.alert('ડાઉનલોડ એરર', 'APK ડાઉનલોડ લિંક ખોલવામાં અસમર્થ.');
      });
    }
  };

  const handleInstallPWA = () => {
    // If native prompt is available (Android Chrome, Desktop Chrome/Edge)
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setIsStandalone(true);
        }
        setDeferredPrompt(null);
      });
      return;
    }

    // For iOS Safari or browsers without beforeinstallprompt, show the interactive visual guide
    setShowIosModal(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TopBar
        title="ડાઉનલોડ એપ / Download App"
        showBack={true}
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(family)/about' as any);
          }
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner Card */}
        <Card style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.primary }]}>
          <View style={[styles.glowHalo, { backgroundColor: theme.primaryLight }]} />
          <Image
            source={require('@/../assets/images/logo.png')}
            style={styles.heroLogo}
            resizeMode="contain"
          />

          <View style={[styles.versionPill, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.versionText, { color: theme.primary }]}>
              🚀 Official Release • v{appVersion} (Android & iOS)
            </Text>
          </View>

          <Text style={[styles.heroTitle, { color: theme.text }]}>
            અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા
          </Text>

          <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
            હવે આપણા સમાજનો સંપૂર્ણ રેકોર્ડ, બ્લડ ગ્રૂપ ડિરેક્ટરી અને ડિજિટલ ફેમિલી ટ્રી આપના મોબાઈલમાં હંમેશા સાથે રાખો!
          </Text>
        </Card>

        {/* 1. Android Direct Download Card */}
        <Card style={[styles.downloadOptionCard, { borderColor: '#10B981', backgroundColor: theme.card }]}>
          <View style={styles.optionHeader}>
            <View style={[styles.osIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="logo-android" size={32} color="#10B981" />
            </View>
            <View style={styles.optionInfo}>
              <View style={styles.badgeRow}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>
                  Android APK Download
                </Text>
                <View style={[styles.officialBadge, { backgroundColor: '#D1FAE5' }]}>
                  <Text style={[styles.officialText, { color: '#047857' }]}>DIRECT APK</Text>
                </View>
              </View>
              <Text style={[styles.optionDesc, { color: theme.textSecondary }]}>
                કોઈપણ એન્ડ્રોઇડ ફોનમાં સીધી ઇન્સ્ટોલ કરો (Fast, Safe & Secure).
              </Text>
            </View>
          </View>

          <View style={styles.specRow}>
            <Text style={[styles.specText, { color: theme.textSecondary }]}>📱 Android 8.0+</Text>
            <Text style={[styles.specText, { color: theme.textSecondary }]}>📦 Size: ~45 MB</Text>
            <Text style={[styles.specText, { color: theme.textSecondary }]}>🔒 Verified APK</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleDownloadAndroid}
            style={[styles.primaryActionBtn, { backgroundColor: '#10B981' }]}
          >
            <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>
              Download Android APK / ડાઉનલોડ કરો
            </Text>
          </TouchableOpacity>
        </Card>

        {/* 2. iPhone / iPad (iOS PWA) Installation Card */}
        <Card style={[styles.downloadOptionCard, { borderColor: '#0284C7', backgroundColor: theme.card }]}>
          <View style={styles.optionHeader}>
            <View style={[styles.osIconCircle, { backgroundColor: '#F0F9FF' }]}>
              <Ionicons name="logo-apple" size={32} color="#0284C7" />
            </View>
            <View style={styles.optionInfo}>
              <View style={styles.badgeRow}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>
                  iPhone / iOS (PWA App)
                </Text>
                <View style={[styles.officialBadge, { backgroundColor: isStandalone ? '#D1FAE5' : '#E0F2FE' }]}>
                  <Text style={[styles.officialText, { color: isStandalone ? '#047857' : '#0369A1' }]}>
                    {isStandalone ? 'INSTALLED ✅' : 'NO APP STORE NEEDED'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.optionDesc, { color: theme.textSecondary }]}>
                {isStandalone
                  ? 'આપ આ એપ્લિકેશન હોમ સ્ક્રીનથી વાપરી રહ્યા છો!'
                  : 'Safari બ્રાઉઝરથી ૧ ક્લિકમાં હોમ સ્ક્રીન પર ઑફિશિયલ એપ તરીકે ઇન્સ્ટોલ કરો.'}
              </Text>
            </View>
          </View>

          <View style={styles.specRow}>
            <Text style={[styles.specText, { color: theme.textSecondary }]}>🍎 iOS / iPadOS</Text>
            <Text style={[styles.specText, { color: theme.textSecondary }]}>⚡ Instant Install</Text>
            <Text style={[styles.specText, { color: theme.textSecondary }]}>🔄 Auto Updates</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleInstallPWA}
            style={[styles.primaryActionBtn, { backgroundColor: isStandalone ? '#10B981' : '#0284C7' }]}
          >
            <Ionicons name={isStandalone ? 'checkmark-circle' : 'add-circle-outline'} size={20} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>
              {isStandalone
                ? '✅ એપ ઇન્સ્ટોલ થયેલી છે (App Installed)'
                : deferredPrompt
                ? 'Install App / ઇન્સ્ટોલ કરો (1-Click)'
                : 'Add to Home Screen / iOS પર ઇન્સ્ટોલ કરો'}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Features Checklist */}
        <Card style={styles.featuresCard}>
          <Text style={[styles.featuresTitle, { color: theme.text }]}>
            ✨ એપ્લિકેશનની વિશેષતાઓ (App Features):
          </Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={[styles.featureText, { color: theme.text }]}>
                સંપૂર્ણ સમાજ પુસ્તિકા (Booklet) અને ફેમિલી કાર્ડ્સ
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={[styles.featureText, { color: theme.text }]}>
                ઇમરજન્સી બ્લડ ગ્રૂપ (Blood Group) તથા વતન સર્ચ
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={[styles.featureText, { color: theme.text }]}>
                ડિજિટલ ફેમિલી ટ્રી (Family Tree) ડાયનેમિક વ્યુ
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={[styles.featureText, { color: theme.text }]}>
                સંપૂર્ણ પીડીએફ (PDF) એક્સપોર્ટ અને ડાયરેક્ટ પ્રિન્ટ
              </Text>
            </View>
          </View>
        </Card>

        {/* Footer Note */}
        <View style={styles.helpBox}>
          <Text style={[styles.helpText, { color: theme.textMuted }]}>
            © 2026 શ્રી અમદાવાદ ડબગર સમાજ. સર્વ અધિકાર સુરક્ષિત.
          </Text>
        </View>
      </ScrollView>

      {/* iOS Safari PWA Installation Step-by-Step Modal */}
      <Modal
        visible={showIosModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowIosModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowIosModal(false)}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={[styles.modalAppleIcon, { backgroundColor: '#F0F9FF' }]}>
                  <Ionicons name="logo-apple" size={24} color="#0284C7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    iPhone / iPad પર ઇન્સ્ટોલ કરો
                  </Text>
                  <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
                    App Store વગર ૧૦ સેકન્ડમાં હોમ સ્ક્રીન પર મેળવો
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowIosModal(false)}
                style={[styles.closeModalBtn, { backgroundColor: theme.backgroundElement }]}
              >
                <Ionicons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.stepsContainer}>
              {/* Step 1 */}
              <View style={[styles.stepItem, { backgroundColor: theme.backgroundElement }]}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#0284C7' }]}>
                  <Text style={styles.stepNumberText}>૧</Text>
                </View>
                <View style={styles.stepTextBox}>
                  <Text style={[styles.stepHeading, { color: theme.text }]}>
                    Safari ના Share બટન પર ટેપ કરો
                  </Text>
                  <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                    Safari બ્રાઉઝરમાં નીચેની પટ્ટીમાં વચ્ચે રહેલું{' '}
                    <Text style={{ fontWeight: '800', color: '#0284C7' }}>Share [ 📤 ]</Text> આઇકન દબાવો.
                  </Text>
                </View>
              </View>

              {/* Step 2 */}
              <View style={[styles.stepItem, { backgroundColor: theme.backgroundElement }]}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#0284C7' }]}>
                  <Text style={styles.stepNumberText}>૨</Text>
                </View>
                <View style={styles.stepTextBox}>
                  <Text style={[styles.stepHeading, { color: theme.text }]}>
                    'Add to Home Screen' પસંદ કરો
                  </Text>
                  <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                    શેર મેનુમાં થોડું નીચે સ્ક્રોલ કરી{' '}
                    <Text style={{ fontWeight: '800', color: theme.text }}>
                      'Add to Home Screen' (➕)
                    </Text>{' '}
                    પર ક્લિક કરો.
                  </Text>
                </View>
              </View>

              {/* Step 3 */}
              <View style={[styles.stepItem, { backgroundColor: theme.backgroundElement }]}>
                <View style={[styles.stepNumberBadge, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.stepNumberText}>૩</Text>
                </View>
                <View style={styles.stepTextBox}>
                  <Text style={[styles.stepHeading, { color: theme.text }]}>
                    ઉપર જમણે 'Add' પર ક્લિક કરો
                  </Text>
                  <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                    બસ! ઑફિશિયલ એપ તમારા આઇફોનની હોમ સ્ક્રીન પર ઇન્સ્ટોલ થઈ જશે.
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowIosModal(false)}
              style={[styles.modalDoneBtn, { backgroundColor: '#0284C7' }]}
            >
              <Text style={styles.modalDoneBtnText}>સમજાઈ ગયું / Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  heroCard: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 30px rgba(2, 132, 199, 0.12)',
      },
      default: {
        elevation: 3,
      },
    }),
  },
  glowHalo: {
    position: 'absolute',
    top: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.7,
  },
  heroLogo: {
    width: 90,
    height: 90,
    marginBottom: 14,
  },
  versionPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 10,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  downloadOptionCard: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 14,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  optionHeader: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  osIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  officialBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  officialText: {
    fontSize: 10,
    fontWeight: '800',
  },
  optionDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  specText: {
    fontSize: 11,
    fontWeight: '600',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  featuresCard: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
  },
  featuresTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  featuresList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    fontWeight: '600',
  },
  helpBox: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 24,
    gap: 4,
  },
  helpText: {
    fontSize: 12,
    fontWeight: '600',
  },
  helpLink: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
      },
      default: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalAppleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
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
  stepsContainer: {
    gap: 10,
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  stepTextBox: {
    flex: 1,
    gap: 2,
  },
  stepHeading: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
  modalDoneBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
