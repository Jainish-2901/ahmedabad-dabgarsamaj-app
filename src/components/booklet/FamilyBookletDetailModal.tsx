import React, { useEffect, useRef, useState } from 'react';
import {
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
import ViewShot from 'react-native-view-shot';
import { useTheme } from '@/constants/theme';
import { CommunityFamilyBookletItem } from '@/features/directory/directoryService';
import { relationshipsService } from '@/features/tree/relationshipsService';
import { buildFamilyTree, TreeDataStructure } from '@/features/tree/treeBuilder';
import { Avatar } from '@/components/ui/Avatar';
import { formatAgeShort, formatDate } from '@/lib/utils/date';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { TreeNodeComponent } from '@/components/tree/TreeNodeComponent';
import { MemberProfileModal } from '@/components/tree/MemberProfileModal';
import { getOccupationDisplay } from '@/constants/occupations';
import { exportTreeAsImage } from '@/lib/utils/exportTree';
import { exportFamilyAsPdf, printFamilyDirectly } from '@/lib/utils/exportPdf';
import { FamilyMember } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';

export interface FamilyBookletDetailModalProps {
  visible: boolean;
  item: CommunityFamilyBookletItem | null;
  onClose: () => void;
}

export function FamilyBookletDetailModal({
  visible,
  item,
  onClose,
}: FamilyBookletDetailModalProps) {
  const router = useRouter();
  const theme = useTheme();
  const viewShotRef = useRef<any>(null);

  const [treeData, setTreeData] = useState<TreeDataStructure | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [selectedTreeMember, setSelectedTreeMember] = useState<FamilyMember | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    if (!item) {
      setTreeData(null);
      return;
    }

    const loadTree = async () => {
      const relRes = await relationshipsService.getFamilyRelationships(item.family.id);
      const constructed = buildFamilyTree(item.members, relRes.relationships);
      setTreeData(constructed);
    };

    loadTree();
  }, [item]);

  if (!visible || !item) return null;

  const { family, headMember, members } = item;

  const handleCall = (phone?: string | null) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (cleanPhone) {
      Linking.openURL(`tel:${cleanPhone}`);
    }
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(1.8, prev + 0.15));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(0.6, prev - 0.15));
  };

  const handleResetZoom = () => {
    setZoomScale(1);
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    await exportFamilyAsPdf(family, members);
    setExportingPdf(false);
  };

  const handlePrint = async () => {
    await printFamilyDirectly(family, members);
  };

  const handleExportTree = async () => {
    setExporting(true);
    await exportTreeAsImage(viewShotRef, `family-tree-${family?.family_code || 'booklet'}`);
    setExporting(false);
  };

  const areaText = family.area?.name || family.city || 'Gujarat';
  const familyTitle = headMember?.name ? `${headMember.name}'s Family` : 'Community Family';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        {/* Top Modal Header */}
        <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.modalHeaderTitle, { color: theme.text }]} numberOfLines={1}>
              {familyTitle}
            </Text>
            <Text style={[styles.modalHeaderSub, { color: theme.textSecondary }]}>
              Digital Booklet Page • {family.family_code}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleExportPdf}
              disabled={exportingPdf}
              style={[styles.headerPdfBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
            >
              <Ionicons name="document-text-outline" size={15} color={theme.primary} />
              <Text style={[styles.headerPdfBtnText, { color: theme.primary }]}>
                {exportingPdf ? '...' : 'PDF'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePrint}
              style={[styles.headerPdfBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            >
              <Ionicons name="print-outline" size={15} color={theme.text} />
              <Text style={[styles.headerPdfBtnText, { color: theme.text }]}>Print</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.backgroundElement }]}
            >
              <Ionicons name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
          {/* Family Hero Card */}
          <Card style={styles.heroCard}>
            <View style={styles.heroTop}>
              <Avatar
                name={headMember ? headMember.name : 'Head'}
                photoUrl={headMember?.photo_url}
                gender={headMember?.gender}
                size={72}
                enablePreview={true}
                subtitle="Family Head / પરિવારના વડા"
              />
              <View style={styles.heroDetails}>
                <View style={styles.heroTitleRow}>
                  <Text style={[styles.heroHeadName, { color: theme.text }]}>
                    {headMember ? headMember.name : 'Family Head'}
                  </Text>
                </View>
                <View style={styles.badgeRow}>
                  <Badge label="Family Head / વડા" variant="primary" size="sm" />
                  <Badge label={family.family_code} variant="success" size="sm" />
                </View>

                {headMember?.mobile ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleCall(headMember.mobile!)}
                    style={styles.heroCallRow}
                  >
                    <Ionicons name="call" size={14} color={theme.primary} />
                    <Text style={[styles.heroCallText, { color: theme.primary }]}>
                      {headMember.mobile}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Residence details */}
            <View style={[styles.addressBox, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.addressLine}>
                <Ionicons name="location" size={15} color={theme.primary} />
                <Text style={[styles.addressLabel, { color: theme.textSecondary }]}>વિસ્તાર / Area:</Text>
                <Text style={[styles.addressValue, { color: theme.text }]}>{areaText}</Text>
              </View>
              {family.address ? (
                <View style={[styles.addressLine, { marginTop: 6 }]}>
                  <Ionicons name="home-outline" size={15} color={theme.textSecondary} />
                  <Text style={[styles.addressLabel, { color: theme.textSecondary }]}>સરનામું / Address:</Text>
                  <Text style={[styles.addressValue, { color: theme.text }]}>
                    {family.address}, {family.city} - {family.pincode}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* PDF & Print Action Banner inside Hero Card */}
            <View style={styles.pdfBannerRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleExportPdf}
                disabled={exportingPdf}
                style={[styles.actionBannerBtn, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="document-text" size={16} color="#FFFFFF" />
                <Text style={styles.actionBannerBtnText}>
                  {exportingPdf ? 'Generating PDF...' : '📄 Export as PDF / ડાઉનલોડ'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handlePrint}
                style={[styles.actionBannerPrintBtn, { borderColor: theme.primary, backgroundColor: theme.primaryLight }]}
              >
                <Ionicons name="print" size={16} color={theme.primary} />
                <Text style={[styles.actionBannerPrintBtnText, { color: theme.primary }]}>
                  🖨️ Print / પ્રિન્ટ
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Members Detail Cards */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              👥 પરિવારના સભ્યોની સંપૂર્ણ વિગતો ({members.length})
            </Text>

            {members.map((m) => {
              const occDisplay = getOccupationDisplay(m.occupation_type);
              const edu = m.educationRecord;
              const occ = m.occupationRecord;
              const d = m.occupation_details || {};

              const orgName = occ?.organization_name || occ?.business_name || d.company_name || d.shop_name || d.business_name || d.practice_name || d.school_or_college;
              const roleName = occ?.designation || d.designation || d.profession || d.specialization || d.current_year_or_std;
              const workCity = occ?.work_location || d.work_location || d.business_location || d.shop_location || d.village_or_taluka;
              const expYears = occ?.experience_years || d.experience_years;

              return (
                <Card key={m.id} style={styles.memberCard}>
                  {/* Top Profile Line */}
                  <View style={styles.memberCardHeader}>
                    <Avatar
                      name={m.name}
                      photoUrl={m.photo_url}
                      gender={m.gender}
                      size={52}
                      enablePreview={true}
                      subtitle={m.display_relation || m.relation}
                    />
                    <View style={styles.memberCardDetails}>
                      <View style={styles.memberNameLine}>
                        <Text style={[styles.memberName, { color: theme.text }]}>
                          {m.is_deceased ? `🕊️ સ્વ. ${m.name}` : m.name}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          {m.is_deceased ? (
                            <Badge label="🕊️ સ્વર્ગસ્થ" variant="neutral" size="sm" />
                          ) : null}
                          <Badge label={m.display_relation || m.relation} variant="neutral" size="sm" />
                        </View>
                      </View>

                      <Text style={[styles.memberAgeText, { color: theme.textSecondary }]}>
                        {m.gender} • {m.is_deceased ? (m.deceased_date ? `સ્વર્ગવાસ: ${formatDate(m.deceased_date) || m.deceased_date}` : 'સ્વર્ગસ્થ') : formatAgeShort(m.dob, m.age)} • DOB: {formatDate(m.dob) || 'N/A'}
                      </Text>

                      {!m.is_deceased && m.mobile ? (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleCall(m.mobile)}
                          style={styles.memberPhoneRow}
                        >
                          <Ionicons name="call" size={13} color={theme.primary} />
                          <Text style={[styles.memberPhoneText, { color: theme.primary }]}>
                            {m.mobile}
                          </Text>
                          <Text style={[styles.tapCallHint, { color: theme.textSecondary }]}>
                            (Tap to Call)
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>

                  {/* Complete Education Section */}
                  <View style={[styles.memberDetailsSection, { borderTopColor: theme.border }]}>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                        શિક્ષણ / Education:
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        🎓 {m.education_status || 'N/A'}
                      </Text>
                    </View>

                    {edu?.institution ? (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                          શાળા/કોલેજ / Institution:
                        </Text>
                        <Text style={[styles.detailValue, { color: theme.text }]}>
                          🏫 {edu.institution}
                        </Text>
                      </View>
                    ) : null}

                    {edu?.passing_year ? (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                          પાસિંગ વર્ષ / Year:
                        </Text>
                        <Text style={[styles.detailValue, { color: theme.text }]}>
                          📅 {edu.passing_year}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Complete Occupation Section */}
                  {m.occupation_type ? (
                    <View style={[styles.memberDetailsSection, { borderTopColor: theme.border }]}>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                          વ્યવસાય / Occupation:
                        </Text>
                        <Text style={[styles.detailValue, { color: theme.text }]}>
                          💼 {occDisplay}
                        </Text>
                      </View>

                      {orgName ? (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                            કંપની / પેઢી / સંસ્થા:
                          </Text>
                          <Text style={[styles.detailValue, { color: theme.text }]}>
                            🏢 {orgName}
                          </Text>
                        </View>
                      ) : null}

                      {roleName ? (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                            હોદ્દો / Designation:
                          </Text>
                          <Text style={[styles.detailValue, { color: theme.text }]}>
                            👔 {roleName}
                          </Text>
                        </View>
                      ) : null}

                      {workCity ? (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                            કામનું સ્થળ / Location:
                          </Text>
                          <Text style={[styles.detailValue, { color: theme.text }]}>
                            📍 {workCity}
                          </Text>
                        </View>
                      ) : null}

                      {expYears ? (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                            અનુભવ / Experience:
                          </Text>
                          <Text style={[styles.detailValue, { color: theme.text }]}>
                            ⏳ {expYears} Years
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Separate Residence Address if applicable */}
                  {m.residence_type === 'SEPARATE' && m.separate_address ? (
                    <View style={[styles.memberDetailsSection, { borderTopColor: theme.border }]}>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                          અલગ સરનામું / Residence:
                        </Text>
                        <Text style={[styles.detailValue, { color: theme.text }]}>
                          🏠 {m.separate_address}, {m.separate_city || ''} - {m.separate_pincode || ''}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>

          {/* Family Tree Preview Section with Full Height, Zoom (+/-) and Export */}
          {treeData && treeData.rootUnits.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.treeHeaderRow}>
                <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>
                  🌳 ફેમિલી ટ્રી / Family Tree
                </Text>

                <View style={styles.treeHeaderActions}>
                  {/* Zoom Controls */}
                  <View style={[styles.zoomToolbar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn}>
                      <Text style={[styles.zoomBtnText, { color: theme.text }]}>＋</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.zoomBtn} onPress={handleResetZoom}>
                      <Text style={[styles.zoomResetText, { color: theme.textSecondary }]}>
                        {Math.round(zoomScale * 100)}%
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut}>
                      <Text style={[styles.zoomBtnText, { color: theme.text }]}>－</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleExportTree}
                    disabled={exporting}
                    style={[styles.treeExportBtn, { backgroundColor: theme.primaryLight }]}
                  >
                    <Ionicons name="camera-outline" size={15} color={theme.primary} />
                    <Text style={[styles.treeExportBtnText, { color: theme.primary }]}>
                      {exporting ? '...' : '📸 Export'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Card style={styles.treeCard}>
                {/* Horizontal Panning Canvas for Full Generation Display */}
                <ScrollView
                  horizontal
                  nestedScrollEnabled={true}
                  showsHorizontalScrollIndicator={true}
                  contentContainerStyle={styles.canvasHorizontalContent}
                >
                  <ViewShot
                    ref={viewShotRef}
                    options={{ format: 'png', quality: 1 }}
                    style={[
                      styles.treeCanvas,
                      {
                        backgroundColor: theme.background,
                        transform: [{ scale: zoomScale }],
                      },
                    ]}
                  >
                    <View style={{ alignItems: 'center', paddingVertical: 14 }}>
                      {treeData.rootUnits.map((rootNode) => (
                        <TreeNodeComponent
                          key={rootNode.member.id}
                          node={rootNode}
                          onSelectMember={(m) => setSelectedTreeMember(m)}
                        />
                      ))}
                    </View>
                  </ViewShot>
                </ScrollView>
              </Card>
            </View>
          )}
        </ScrollView>

        {/* Member Profile Modal on Tree Node Tap */}
        <MemberProfileModal
          member={selectedTreeMember}
          visible={selectedTreeMember !== null}
          onClose={() => setSelectedTreeMember(null)}
          onNavigate={(memberId) => {
            setSelectedTreeMember(null);
            onClose();
            setTimeout(() => {
              router.push(`/(family)/member/${memberId}` as any);
            }, 100);
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalHeaderSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
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
    padding: 16,
    marginBottom: 16,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroDetails: {
    flex: 1,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroHeadName: {
    fontSize: 18,
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  heroCallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  heroCallText: {
    fontSize: 13,
    fontWeight: '700',
  },
  addressBox: {
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  addressLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 110,
    flexShrink: 0,
  },
  addressValue: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  memberCard: {
    padding: 14,
    marginBottom: 12,
  },
  memberCardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  memberCardDetails: {
    flex: 1,
  },
  memberNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  memberAgeText: {
    fontSize: 12,
    marginTop: 2,
  },
  memberPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  memberPhoneText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tapCallHint: {
    fontSize: 11,
    marginLeft: 2,
  },
  memberDetailsSection: {
    borderTopWidth: 1,
    paddingTop: 6,
    marginTop: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 3,
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    width: 130,
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    lineHeight: 18,
  },
  treeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  treeHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  treeExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  treeExportBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  treeCard: {
    padding: 0,
    overflow: 'hidden',
    position: 'relative',
    borderRadius: 16,
  },
  zoomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  zoomBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  zoomResetText: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 3,
  },
  canvasHorizontalContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  treeCanvas: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 12,
  },
  headerPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  headerPdfBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pdfBannerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBannerBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBannerPrintBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBannerPrintBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
