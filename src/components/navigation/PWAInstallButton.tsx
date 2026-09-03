import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export function PWAInstallButton() {
  const theme = useTheme();

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    // Check if already installed & running as standalone PWA
    const standaloneCheck =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standaloneCheck);

    // Detect iOS
    const iOSCheck =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOSCheck);

    // Capture Chrome/Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Don't render on native mobile apps or if already installed as standalone
  if (Platform.OS !== 'web' || isStandalone) {
    return null;
  }

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleInstallClick}
        style={[styles.installBtn, { backgroundColor: theme.primary }]}
        accessibilityLabel="Install App"
      >
        <Ionicons name="download-outline" size={15} color="#ffffff" />
        <Text style={styles.installBtnText}>Install App</Text>
      </TouchableOpacity>

      {/* iOS & Browser Instructions Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.iconCircle, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="phone-portrait-outline" size={22} color={theme.primary} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    {isIOS ? 'iPhone માં એપ ઇન્સ્ટોલ કરો' : 'એપ ઇન્સ્ટોલ કરો (Install App)'}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                    ડબગર સમાજ પરિચય પુસ્તિકા
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={[styles.closeBtn, { backgroundColor: theme.backgroundElement }]}
              >
                <Ionicons name="close" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Steps Guide */}
            <View style={styles.stepsContainer}>
              {isIOS ? (
                <>
                  <View style={styles.stepRow}>
                    <View style={[styles.stepNumberBadge, { backgroundColor: theme.primary }]}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <Text style={[styles.stepText, { color: theme.text }]}>
                      Safari બ્રાઉઝરમાં નીચે આપેલા <Text style={{ fontWeight: '700' }}>Share (📤)</Text> બટન પર ક્લિક કરો.
                    </Text>
                  </View>

                  <View style={styles.stepRow}>
                    <View style={[styles.stepNumberBadge, { backgroundColor: theme.primary }]}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <Text style={[styles.stepText, { color: theme.text }]}>
                      મેનૂમાં નીચે સ્ક્રોલ કરીને <Text style={{ fontWeight: '700' }}>"Add to Home Screen" (➕ હોમ સ્ક્રીન પર ઉમેરો)</Text> સિલેક્ટ કરો.
                    </Text>
                  </View>

                  <View style={styles.stepRow}>
                    <View style={[styles.stepNumberBadge, { backgroundColor: theme.primary }]}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <Text style={[styles.stepText, { color: theme.text }]}>
                      જમણી બાજુ ઉપર આપેલ <Text style={{ fontWeight: '700' }}>"Add"</Text> બટન દબાવો. એપ તમારા હોમ સ્ક્રીન પર આવી જશે! 🎉
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.stepRow}>
                    <View style={[styles.stepNumberBadge, { backgroundColor: theme.primary }]}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <Text style={[styles.stepText, { color: theme.text }]}>
                      બ્રાઉઝરના ઉપરના મેનૂ <Text style={{ fontWeight: '700' }}>ત્રણ ટપકાં (⋮)</Text> પર ક્લિક કરો.
                    </Text>
                  </View>

                  <View style={styles.stepRow}>
                    <View style={[styles.stepNumberBadge, { backgroundColor: theme.primary }]}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <Text style={[styles.stepText, { color: theme.text }]}>
                      <Text style={{ fontWeight: '700' }}>"Install App" (એપ ઇન્સ્ટોલ કરો)</Text> અથવા <Text style={{ fontWeight: '700' }}>"Add to Home Screen"</Text> પર ક્લિક કરો.
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* OK Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowModal(false)}
              style={[styles.modalOkBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.modalOkBtnText}>સમજાઈ ગયું / Got It 👍</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  installBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 6,
  },
  installBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepsContainer: {
    gap: 14,
    marginBottom: 22,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  modalOkBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalOkBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default PWAInstallButton;
