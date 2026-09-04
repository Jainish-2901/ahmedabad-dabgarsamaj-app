import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/constants/theme';
import { TopBar } from '@/components/navigation/TopBar';
import { Card } from '@/components/ui/Card';
import { Ionicons } from '@expo/vector-icons';

export default function TermsAndConditionsScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TopBar
        title="નિયમો અને શરતો / Terms & Conditions"
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
        <Card style={styles.headerCard}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="document-text" size={32} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>
            નિયમો અને શરતો (Terms & Conditions)
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા • માન્યતા: ૨૦૨૬
          </Text>
        </Card>

        {/* Term 1 */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              ૧. સ્વીકૃતિ અને પાત્રતા (Acceptance & Eligibility)
            </Text>
          </View>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            આ એપ્લિકેશન અને વેબ પોર્ટલનો ઉપયોગ કરીને આપ આ નિયમો અને શરતોનું સંપૂર્ણ પાલન કરવા સહમત થાઓ છો. આ એપ્લિકેશન માત્ર શ્રી અમદાવાદ ડબગર સમાજના સભ્યો અને તેમના પરિવારો માટે છે.
          </Text>
        </Card>

        {/* Term 2 */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="finger-print" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              ૨. માહિતીની સત્યતા અને જવાબદારી (Accuracy of Information)
            </Text>
          </View>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            • પરિવારના વડા તથા સભ્યો દ્વારા જે પણ માહિતી (નામ, જન્મ તારીખ, બ્લડ ગ્રૂપ, વ્યવસાય વગેરે) ઉમેરવામાં આવે તે સંપૂર્ણપણે સાચી અને સચોટ હોવી જોઈએ.
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            • કોઈપણ અન્ય વ્યક્તિ કે પરિવારની ખોટી ઓળખ બનાવીને અનધિકૃત માહિતી દાખલ કરવી પ્રતિબંધિત છે.
          </Text>
        </Card>

        {/* Term 3 */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="shield" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              ૩. એકાઉન્ટ સુરક્ષા અને પાસવર્ડ (Account Security)
            </Text>
          </View>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            • આપના એકાઉન્ટનો પાસવર્ડ ગુપ્ત રાખવાની સંપૂર્ણ જવાબદારી સભ્યની રહેશે.
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            • જો કોઈ અનધિકૃત પ્રવૃત્તિ ધ્યાને આવે તો તુરંત જ પાસવર્ડ બદલીને એડમિનનો સંપર્ક કરવો.
          </Text>
        </Card>

        {/* Term 4 */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="ban" size={20} color="#EF4444" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              ૪. પ્રતિબંધિત પ્રવૃત્તિઓ (Prohibited Conduct)
            </Text>
          </View>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            • સમાજના સભ્યોની અંગત વિગતો કે ફોન નંબર્સનો કોઈપણ પ્રકારના વ્યાવસાયિક માર્કેટિંગ, સ્પામ કે અનિચ્છનીય હેતુ માટે ઉપયોગ કરવો સખત મનાઈ છે.
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            • કોઈપણ અયોગ્ય ભાષા, તસવીર કે ગેરકાયદેસર સામગ્રી અપલોડ કરવા બદલ એકાઉન્ટ સ્થગિત (Suspend) કરી શકાશે.
          </Text>
        </Card>

        {/* Term 5 */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="refresh-circle" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              ૫. નિયમોમાં ફેરફાર (Modifications)
            </Text>
          </View>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            સમાજ સમિતિ જરૂરિયાત મુજબ આ નિયમો અને શરતોમાં સુધારો કરવાનો અધિકાર ધરાવે છે. કોઈપણ ફેરફાર એપ્લિકેશન તથા વેબસાઇટ મારફતે જાહેર કરવામાં આવશે.
          </Text>
        </Card>

        <View style={styles.footerNote}>
          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            © 2026 શ્રી અમદાવાદ ડબગર સમાજ. સર્વ અધિકાર સુરક્ષિત.
          </Text>
        </View>
      </ScrollView>
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
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  headerCard: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    borderRadius: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionCard: {
    padding: 18,
    marginBottom: 12,
    borderRadius: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 6,
  },
  footerNote: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
