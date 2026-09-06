import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/constants/theme';
import { Family, FamilyMember } from '@/types/database';
import { EditFamilyAddressModal } from '@/components/family/EditFamilyAddressModal';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatAgeShort, formatDate } from '@/lib/utils/date';
import { EmptyState } from '@/components/ui/EmptyState';
import { exportFamilyIdCardAsPdf } from '@/lib/utils/exportPdf';
import { Ionicons } from '@expo/vector-icons';

export interface CardTabViewProps {
  family: Family | null;
  members: FamilyMember[];
  onNavigateTab: (tabId: 'home' | 'members' | 'tree' | 'card') => void;
  onRefresh?: () => void;
}

export function CardTabView({ family, members, onNavigateTab, onRefresh }: CardTabViewProps) {
  const router = useRouter();
  const theme = useTheme();
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');
  const [downloading, setDownloading] = useState(false);

  if (!family) {
    return (
      <View style={styles.centerContainer}>
        <EmptyState
          icon={<Text style={{ fontSize: 48, marginBottom: 8 }}>🪪</Text>}
          title="No Family Registered Yet"
          description="Please complete your family registration to generate your official digital family card and unique family code."
          actionTitle="+ Setup Family / પરિવાર નોંધણી કરો"
          onAction={() => router.push('/(family)/setup-family' as any)}
        />
      </View>
    );
  }

  const livingMembers = members.filter(
    (m) => !m.is_deceased && (m as any).status !== 'DECEASED' && !(m.occupation_details as any)?.is_deceased
  );

  const headMember =
    livingMembers.find((m) => m.relation === 'FAMILY_HEAD') ||
    members.find((m) => m.relation === 'FAMILY_HEAD') ||
    members[0];
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    `https://ahmedabaddabgarsamaj.vercel.app/family-card?code=${family.family_code}`
  )}`;

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      await exportFamilyIdCardAsPdf(family, members);
    } finally {
      setDownloading(false);
    }
  };

  const maleCount = livingMembers.filter((m) => m.gender === 'Male').length;
  const femaleCount = livingMembers.filter((m) => m.gender === 'Female').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Banner & Flip Control */}
      <View style={styles.headerBar}>
        <View>
          <Text style={[styles.screenTitle, { color: theme.text }]}>
            સત્તાવાર ડિજિટલ ઓળખપત્ર
          </Text>
          <Text style={[styles.screenSubtitle, { color: theme.textSecondary }]}>
            Official Family Smart ID Card • ડબગર સમાજ
          </Text>
        </View>

        {/* Front / Back Flip Pill Switcher */}
        <View style={[styles.flipSwitcher, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setCardSide('front')}
            style={[
              styles.flipOption,
              cardSide === 'front' && { backgroundColor: theme.primary },
            ]}
          >
            <Text
              style={[
                styles.flipOptionText,
                { color: cardSide === 'front' ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              🪪 Front / સમુખ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setCardSide('back')}
            style={[
              styles.flipOption,
              cardSide === 'back' && { backgroundColor: theme.primary },
            ]}
          >
            <Text
              style={[
                styles.flipOptionText,
                { color: cardSide === 'back' ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              📋 Back / પાછળ
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* THE SMART ID CARD CONTAINER */}
      <View style={[styles.idCardContainer, { backgroundColor: theme.card, borderColor: '#0284C7' }]}>
        {/* Card Header: Deep Navy Gradient Style */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.samajTitle}>અમદાવાદ ડબગર સમાજ</Text>
            <Text style={styles.samajSubtitle}>OFFICIAL DIGITAL IDENTITY CARD</Text>
          </View>
          <View style={styles.codeBadge}>
            <Text style={styles.codeBadgeText}>{family.family_code}</Text>
          </View>
        </View>

        {cardSide === 'front' ? (
          /* ================= FRONT SIDE ================= */
          <View style={styles.cardBody}>
            <View style={styles.frontMainRow}>
              {/* Head Avatar */}
              <View style={styles.photoContainer}>
                <View style={styles.avatarBorder}>
                  <Avatar
                    name={headMember?.name || 'Head'}
                    photoUrl={headMember?.photo_url}
                    gender={headMember?.gender}
                    size={76}
                  />
                </View>
                <View style={styles.headTag}>
                  <Text style={styles.headTagText}>પરિવાર વડા</Text>
                </View>
              </View>

              {/* Head & Address Info */}
              <View style={styles.infoContainer}>
                <Text numberOfLines={1} style={[styles.headNameText, { color: theme.text }]}>
                  {headMember?.name || 'Head Member'}
                </Text>

                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={13} color={theme.primary} />
                  <Text style={[styles.infoDetailText, { color: theme.text }]}>
                    {headMember?.mobile || 'N/A'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="flag-outline" size={13} color={theme.primary} />
                  <Text style={[styles.infoDetailText, { color: theme.text }]}>
                    વતન: {(family as any).native_place || family.city || 'Ahmedabad'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={13} color={theme.primary} />
                  <Text numberOfLines={2} style={[styles.infoDetailText, { color: theme.textSecondary }]}>
                    {family.address}, {family.city} - {family.pincode}
                  </Text>
                </View>
              </View>

              {/* Scannable Verification QR Code */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => router.push(`/(family)/family-card?code=${family.family_code}` as any)}
                style={styles.qrContainer}
              >
                <Image
                  source={{ uri: qrCodeUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
                <Text style={styles.qrCaption}>Scan to Verify</Text>
                <Text style={styles.qrCaptionGu}>સત્તાવાર સ્કેન</Text>
              </TouchableOpacity>
            </View>

            {/* Front Card Footer Bar */}
            <View style={[styles.cardFooter, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }]}>
              <View style={styles.verifiedBadgeRow}>
                <Ionicons name="shield-checkmark" size={15} color="#16A34A" />
                <Text style={styles.verifiedText}>VERIFIED CENSUS ID • સત્તાવાર પ્રમાણિત</Text>
              </View>
              <Text style={[styles.memberCountText, { color: theme.primary }]}>
                સભ્યો: {livingMembers.length} ({maleCount} પુરુષ / {femaleCount} સ્ત્રી)
              </Text>
            </View>
          </View>
        ) : (
          /* ================= BACK SIDE ================= */
          <View style={styles.cardBody}>
            <View style={[styles.backHeader, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.backHeaderText, { color: theme.text }]}>
                FAMILY ROSTER / પરિવારના સભ્યોની વિગત
              </Text>
              <Text style={[styles.backHeaderCode, { color: theme.primary }]}>
                {family.family_code}
              </Text>
            </View>

            {/* Members Quick Table */}
            <View style={styles.tableContainer}>
              <View style={[styles.tableHead, { borderBottomColor: theme.border }]}>
                <Text style={[styles.thText, { width: 24, textAlign: 'center', color: theme.textSecondary }]}>#</Text>
                <Text style={[styles.thText, { flex: 1, color: theme.textSecondary }]}>નામ / Name</Text>
                <Text style={[styles.thText, { width: 75, textAlign: 'center', color: theme.textSecondary }]}>સંબંધ</Text>
                <Text style={[styles.thText, { width: 50, textAlign: 'center', color: theme.textSecondary }]}>ઉંમર</Text>
                <Text style={[styles.thText, { width: 45, textAlign: 'center', color: theme.textSecondary }]}>બ્લડ</Text>
              </View>

              {livingMembers.map((m, idx) => (
                <View key={m.id} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.tdText, { width: 24, textAlign: 'center', color: theme.textSecondary, fontWeight: '700' }]}>
                    {idx + 1}
                  </Text>
                  <Text numberOfLines={1} style={[styles.tdText, { flex: 1, color: theme.text, fontWeight: '600' }]}>
                    {m.name}
                  </Text>
                  <Text numberOfLines={1} style={[styles.tdText, { width: 75, textAlign: 'center', color: theme.primary }]}>
                    {m.display_relation?.split('/')[0].trim() || m.relation}
                  </Text>
                  <Text style={[styles.tdText, { width: 50, textAlign: 'center', color: theme.textSecondary }]}>
                    {formatAgeShort(m.dob, m.age) || '-'}
                  </Text>
                  <Text style={[styles.tdText, { width: 45, textAlign: 'center', color: '#DC2626', fontWeight: '700' }]}>
                    {m.blood_group || '-'}
                  </Text>
                </View>
              ))}
            </View>

            {/* Back Card Footer */}
            <View style={[styles.cardFooter, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border, justifyContent: 'center' }]}>
              <Text style={[styles.issuedDateText, { color: theme.textSecondary }]}>
                સત્તાવાર પરિચય પત્ર • નોંધણી તારીખ: {new Date().toLocaleDateString('en-GB')}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ACTION BUTTONS: Download, Share, Edit */}
      <View style={styles.actionsCard}>
        <Button
          title="📥 Download / Print ID Card (PDF)"
          onPress={handleDownloadPdf}
          loading={downloading}
          size="lg"
          style={styles.mainDownloadBtn}
        />

        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleDownloadPdf}
            style={[styles.secondaryActionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Ionicons name="share-social-outline" size={18} color={theme.primary} />
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Share ID Card</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setAddressModalVisible(true)}
            style={[styles.secondaryActionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Ionicons name="pencil-outline" size={18} color={theme.primary} />
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>સરનામું બદલો</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Helpful Instructions */}
      <View style={[styles.instructionsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="information-circle-outline" size={20} color={theme.primary} style={{ marginTop: 2 }} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.instructionsTitle, { color: theme.text }]}>
            ઓળખપત્ર ઉપયોગ અંગે માર્ગદર્શન:
          </Text>
          <Text style={[styles.instructionsText, { color: theme.textSecondary }]}>
            • "Download / Print ID Card" પર ક્લિક કરીને કાર્ડને પ્રિન્ટ કરી લેમિનેટ કરાવી શકાય છે.{'\n'}
            • QR કોડ દ્વારા સમાજ પંચ અથવા કોઈ પણ સભ્ય તમારા પરિવારની સત્તાવાર ચકાસણી તરત જ કરી શકે છે.{'\n'}
            • કોઈ પણ જરૂરિયાતમાં આ કાર્ડ ઓળખના સત્તાવાર પુરાવા તરીકે માન્ય છે.
          </Text>
        </View>
      </View>

      {/* Edit Family Address Modal */}
      <EditFamilyAddressModal
        visible={addressModalVisible}
        family={family}
        onClose={() => setAddressModalVisible(false)}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  screenSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  flipSwitcher: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    marginTop: 12,
  },
  flipOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  idCardContainer: {
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
    boxShadow: '0px 8px 24px rgba(2, 132, 199, 0.12)',
    elevation: 4,
    marginBottom: 16,
  },
  cardHeader: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: '#F59E0B',
  },
  cardHeaderLeft: {
    flex: 1,
  },
  samajTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  samajSubtitle: {
    color: '#38BDF8',
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 1,
  },
  codeBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  codeBadgeText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cardBody: {
    padding: 14,
  },
  frontMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoContainer: {
    alignItems: 'center',
    marginRight: 12,
  },
  avatarBorder: {
    borderWidth: 2.5,
    borderColor: '#0284C7',
    borderRadius: 44,
    padding: 2,
  },
  headTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
  },
  headTagText: {
    color: '#0369A1',
    fontSize: 9.5,
    fontWeight: '700',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headNameText: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  infoDetailText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  qrImage: {
    width: 68,
    height: 68,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  qrCaption: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 3,
    textAlign: 'center',
  },
  qrCaptionGu: {
    fontSize: 7.5,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    marginTop: 4,
  },
  verifiedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '800',
  },
  memberCountText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  backHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  backHeaderText: {
    fontSize: 11,
    fontWeight: '800',
  },
  backHeaderCode: {
    fontSize: 11,
    fontWeight: '800',
  },
  tableContainer: {
    marginBottom: 8,
  },
  tableHead: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  thText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
  },
  tdText: {
    fontSize: 11,
  },
  backOfficeText: {
    fontSize: 9.5,
    flex: 1,
  },
  issuedDateText: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  actionsCard: {
    marginBottom: 16,
    gap: 10,
  },
  mainDownloadBtn: {
    borderRadius: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  instructionsCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  instructionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 11.5,
    lineHeight: 18,
  },
});
