import { TopBar } from '@/components/navigation/TopBar';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TopBar
        title="ગોપનીયતા નીતિ / Privacy Policy"
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
            <Ionicons name="shield-checkmark" size={32} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>
            ગોપનીયતા નીતિ (Privacy Policy)
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા • છેલ્લે અપડેટ: ૦૫ સપ્ટેમ્બર ૨૦૨૬ (Last Updated: 05 September 2026)
          </Text>
        </Card>

        {/* Section 1 */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="information-circle" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              ૧. પ્રસ્તાવના (Introduction)
            </Text>
          </View>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            શ્રી અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા એપ્લિકેશન અને વેબ પોર્ટલ આપણા સમાજના પરિવારો અને સભ્યો વચ્ચે પારસ્પરિક પરિચય, સંવાદિતા અને સંપર્ક સ્થાપિત કરવા માટે બનાવવામાં આવી છે. આપના વ્યક્તિગત ડેટાની સુરક્ષા અને ગોપનીયતા જાળવવી એ અમારી સર્વોચ્ચ પ્રાથમિકતા છે.
          </Text>
        </Card>

        {/* Section 2 */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="file-tray-full" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              ૨. અમે કઈ માહિતી એકત્રિત કરીએ છીએ? (Data We Collect)
            </Text>
          </View>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            સમાજ ડિરેક્ટરી અને ફેમિલી ટ્રી યોગ્ય રીતે બનાવવા માટે નીચે મુજબની માહિતી સભ્યો દ્વારા જાતે દાખલ કરવામાં આવે છે:
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletItem, { color: theme.text }]}>
              • પર્સનલ વિગતો: પૂરું નામ, જન્મ તારીખ, બ્લડ ગ્રૂપ, જન્મ સ્થળ/વતન અને પ્રોફાઇલ ફોટો.
            </Text>
            <Text style={[styles.bulletItem, { color: theme.text }]}>
              • સંપર્ક વિગતો: મોબાઈલ નંબર, ઈમેઈલ સરનામું, ઘરનું સરનામું અને રહેઠાણનો વિસ્તાર.
            </Text>
            <Text style={[styles.bulletItem, { color: theme.text }]}>
              • પારિવારિક સંબંધો: પરિવારના વડા સાથેનો સંબંધ, જીવનસાથી, માતા-પિતા અને સંતાનો.
            </Text>
            <Text style={[styles.bulletItem, { color: theme.text }]}>
              • શિક્ષણ અને વ્યવસાય: અભ્યાસ, ડિગ્રી, નોકરી કે વેપારની સંસ્થાનું નામ અને વ્યવસાય પ્રકાર.
            </Text>
          </View>
        </Card>

        {/* Section 3 */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="lock-closed" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              ૩. માહિતીનો ઉપયોગ અને સુરક્ષા (Data Security & Usage)
            </Text>
          </View>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            • એકત્રિત કરવામાં આવેલી માહિતીનો ઉપયોગ માત્ર અને માત્ર સમાજના સભ્યો વચ્ચે અધિકૃત પરિચય, ઇમરજન્સી રક્ત સહાય (Blood Group Search), અને સામાજિક ગતિવિધિઓ માટે જ કરવામાં આવે છે.
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            • અમે કોઈપણ તૃતીય પક્ષ (Third Party), માર્કેટિંગ એજન્સી કે જાહેરાત કંપનીઓને આપનો ડેટા વેચતા કે ભાડે આપતા નથી.
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            • તમામ પાસવર્ડ્સ એન્ક્રિપ્ટેડ સ્વરૂપે સ્ટોર થાય છે અને રો-લેવલ સિક્યોરિટી (RLS) દ્વારા સુરક્ષિત રાખવામાં આવે છે.
          </Text>
        </Card>

        {/* Section 4 */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="people" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              ૪. સભ્યોના અધિકારો (User Rights & Control)
            </Text>
          </View>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            • પરિવારના વડા અથવા અધિકૃત સભ્ય ગમે ત્યારે પોતાની માહિતી સુધારી (Edit) શકે છે.
          </Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            • જો કોઈ સભ્ય પોતાનો ડેટા કાયમ માટે હટાવવા માંગતો હોય, તો એપમાંથી ડીલીટ કરી શકે છે.
          </Text>
        </Card>

        {/* Section 5 */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="shield" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              ૫. નીતિમાં સુધારા (Policy Updates)
            </Text>
          </View>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            સમાજ સમિતિ દ્વારા જરૂરિયાત મુજબ આ ગોપનીયતા નીતિમાં સુધારો કરવાનો અધિકાર ધરાવે છે. કોઈપણ નીતિગત ફેરફાર એપ્લિકેશન તથા વેબસાઇટ મારફતે જાહેર કરવામાં આવશે.
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
    marginBottom: 8,
  },
  bulletList: {
    marginTop: 4,
    gap: 6,
  },
  bulletItem: {
    fontSize: 13,
    lineHeight: 19,
  },
  contactActionsList: {
    marginTop: 8,
    gap: 8,
  },
  contactActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  contactActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactActionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  contactActionSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
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
