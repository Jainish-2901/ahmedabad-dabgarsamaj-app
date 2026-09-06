import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/constants/theme';
import { familyService } from '@/features/family/familyService';
import { relationshipsService } from '@/features/tree/relationshipsService';
import { buildFamilyTree, TreeDataStructure } from '@/features/tree/treeBuilder';
import { Family, FamilyMember } from '@/types/database';
import { DigitalFamilyCard } from '@/components/family/DigitalFamilyCard';
import { TreeNodeComponent } from '@/components/tree/TreeNodeComponent';
import { MemberProfileModal } from '@/components/tree/MemberProfileModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { TopBar } from '@/components/navigation/TopBar';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/AuthContext';

export default function FamilyCardScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ code?: string; q?: string; family_code?: string }>();

  // Extract family code from route params or fallback to browser URL search params
  let targetCode = (params.code || params.q || params.family_code || '').trim();
  if (!targetCode && typeof window !== 'undefined' && window.location?.search) {
    const sp = new URLSearchParams(window.location.search);
    targetCode = (sp.get('code') || sp.get('q') || sp.get('family_code') || '').trim();
  }

  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [treeData, setTreeData] = useState<TreeDataStructure | null>(null);
  const [treeZoom, setTreeZoom] = useState<number>(1);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [fullscreenTree, setFullscreenTree] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 2D Pan Scroll Refs
  const webScrollRef = useRef<ScrollView>(null);
  const verticalScrollRef = useRef<ScrollView>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const [scrollX, setScrollX] = useState<number>(0);
  const [scrollY, setScrollY] = useState<number>(0);
  const [treeLayoutSize, setTreeLayoutSize] = useState<{ width: number; height: number }>({ width: 720, height: 500 });

  const handlePan = (dx: number, dy: number) => {
    const nextX = Math.max(0, scrollX + dx);
    const nextY = Math.max(0, scrollY + dy);
    setScrollX(nextX);
    setScrollY(nextY);

    if (Platform.OS === 'web') {
      (webScrollRef.current as any)?.scrollTo({ x: nextX, y: nextY, animated: true });
    } else {
      if (dx !== 0) {
        horizontalScrollRef.current?.scrollTo({ x: nextX, animated: true });
      }
      if (dy !== 0) {
        verticalScrollRef.current?.scrollTo({ y: nextY, animated: true });
      }
    }
  };

  const handleResetAll = () => {
    setScrollX(0);
    setScrollY(0);
    setTreeZoom(1);
    if (Platform.OS === 'web') {
      (webScrollRef.current as any)?.scrollTo({ x: 0, y: 0, animated: true });
    } else {
      horizontalScrollRef.current?.scrollTo({ x: 0, animated: true });
      verticalScrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const loadData = async () => {
    setError('');
    setLoading(true);

    let loadedFamily: Family | null = null;
    let loadedMembers: FamilyMember[] = [];

    // 1. If scanned from QR code or requested with a family code
    if (targetCode) {
      const res = await familyService.getFamilyByCode(targetCode);
      if (res.error) {
        setError(res.error);
      } else if (res.family) {
        loadedFamily = res.family;
        loadedMembers = res.members;
        setFamily(res.family);
        setMembers(res.members);
      } else {
        setError(`Family code "${targetCode}" not found in database.`);
      }
    } else if (user?.id) {
      // 2. Otherwise load authenticated user's family
      const res = await familyService.getMyFamily(user.id);
      if (res.error) {
        setError(res.error);
      } else if (res.family) {
        loadedFamily = res.family;
        loadedMembers = res.members;
        setFamily(res.family);
        setMembers(res.members);
      }
    } else {
      setFamily(null);
      setMembers([]);
      setTreeData(null);
      setLoading(false);
      return;
    }

    // Load relationships and build generational tree graph
    if (loadedFamily) {
      try {
        const relRes = await relationshipsService.getFamilyRelationships(loadedFamily.id);
        const constructed = buildFamilyTree(loadedMembers, relRes.relationships);
        setTreeData(constructed);
      } catch (treeErr) {
        console.warn('Family tree load error:', treeErr);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user?.id, targetCode]);

  if (loading) {
    return <LoadingState message="Generating digital family card..." />;
  }

  // Error when searching by code
  if (error && !family) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <TopBar
          title="Digital Family Card"
          hideInstallButton={Boolean(targetCode)}
          hideActions={Boolean(targetCode)}
        />
        <View style={styles.centerBody}>
          <EmptyState
            icon={<Text style={{ fontSize: 48, marginBottom: 8 }}>🔍</Text>}
            title="પરિવાર મળ્યો નથી / Family Not Found"
            description={error}
            actionTitle="સમાજ પુસ્તિકા જુઓ / View Directory"
            onAction={() => router.push('/(family)/booklet' as any)}
          />
        </View>
        {!targetCode && <BottomTabBar />}
      </View>
    );
  }

  // If no family is set up yet, show clean EmptyState prompt instead of error
  if (!family) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <TopBar
          title="Digital Family Card"
          hideInstallButton={Boolean(targetCode)}
          hideActions={Boolean(targetCode)}
        />
        <View style={styles.centerBody}>
          <EmptyState
            icon={<Text style={{ fontSize: 48, marginBottom: 8 }}>🪪</Text>}
            title="No Family Registered Yet"
            description="Please complete your family registration to generate your official digital family card and unique family code."
            actionTitle="+ Setup Family / પરિવાર નોંધણી કરો"
            onAction={() => router.push('/(family)/setup-family' as any)}
          />
        </View>
        {!targetCode && <BottomTabBar />}
      </View>
    );
  }

  const isDeceased = (m: FamilyMember) =>
    m.is_deceased === true || (m as any).status === 'DECEASED' || (m.occupation_details as any)?.is_deceased === true;

  // Digital card and directory breakdown list only show living members
  const livingMembers = members.filter((m) => !isDeceased(m));
  const isOwnFamily = !targetCode || Boolean(user && family.head_user_id === user.id);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Clean TopBar: installation prompt, profile and logout are hidden in QR scan mode */}
      <TopBar
        title={family.family_code ? `${family.family_code} - Family Card` : 'Digital Family Card'}
        hideInstallButton={Boolean(targetCode)}
        hideActions={Boolean(targetCode)}
      />

      <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.content}>
        {/* Verification banner when viewed via QR code scan */}
        {targetCode ? (
          <View style={{ marginBottom: 12, padding: 10, borderRadius: 8, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="shield-checkmark" size={22} color="#059669" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#065F46' }}>
                સત્તાવાર પ્રમાણિત ઓળખપત્ર • {family.family_code}
              </Text>
              <Text style={{ fontSize: 11, color: '#047857' }}>
                અમદાવાદ ડબગર સમાજ ડિજિટલ વસ્તી ગણતરી રેકોર્ડ
              </Text>
            </View>
          </View>
        ) : null}

        {/* Main Digital Family Card (Family Tree button omitted as tree graph is embedded below) */}
        <DigitalFamilyCard
          family={family}
          members={livingMembers}
          onPressTree={undefined}
          onPressAddMember={isOwnFamily ? () => router.push('/(family)/add-member' as any) : undefined}
        />

        {/* Complete Members Directory Breakdown Card */}
        <Card style={styles.detailsCard}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>
            Family Members / પરિવારના સભ્યો ({livingMembers.length})
          </Text>

          {livingMembers.map((member) => (
            <TouchableOpacity
              key={member.id}
              activeOpacity={0.7}
              onPress={() => router.push(`/(family)/member/${member.id}` as any)}
              style={[styles.memberItem, { borderBottomColor: theme.border }]}
            >
              <Avatar
                name={member.name}
                photoUrl={member.photo_url}
                gender={member.gender}
                size={40}
              />
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: theme.text }]}>{member.name}</Text>
                <Text style={[styles.memberRelation, { color: theme.primary }]}>
                  {member.display_relation || member.relation}
                </Text>
              </View>
              <View style={styles.memberMeta}>
                {member.age !== undefined ? (
                  <Badge label={`${member.age} yrs`} variant="neutral" size="sm" />
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ))}
        </Card>

        {/* Generational Family Tree Graph Section (Centered with 2D Up/Down/Left/Right scroll and zoom) */}
        {treeData && treeData.rootUnits.length > 0 ? (
          <Card style={styles.treeCard}>
            <View style={styles.treeHeader}>
              <View style={{ flex: 1, minWidth: 200, marginBottom: 8 }}>
                <Text style={[styles.sectionHeading, { color: theme.text, marginBottom: 2 }]}>
                  🌳 કુટુંબ વંશાવલી (Family Tree Graph)
                </Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                  કુટુંબનું પેઢીવાર વૃક્ષ (સભ્ય પર ટેપ કરી વિગત જુઓ)
                </Text>
              </View>

              {/* Complete Controls Toolbar */}
              <View style={styles.controlsCluster}>
                {/* 4-Directional Pan Controls (Up, Down, Left, Right) */}
                <View style={[styles.panControlCluster, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <TouchableOpacity
                    onPress={() => handlePan(-240, 0)}
                    style={styles.panBtn}
                    accessibilityLabel="Scroll Left"
                  >
                    <Ionicons name="arrow-back" size={16} color={theme.text} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePan(0, -180)}
                    style={styles.panBtn}
                    accessibilityLabel="Scroll Up"
                  >
                    <Ionicons name="arrow-up" size={16} color={theme.text} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePan(0, 180)}
                    style={styles.panBtn}
                    accessibilityLabel="Scroll Down"
                  >
                    <Ionicons name="arrow-down" size={16} color={theme.text} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePan(240, 0)}
                    style={styles.panBtn}
                    accessibilityLabel="Scroll Right"
                  >
                    <Ionicons name="arrow-forward" size={16} color={theme.text} />
                  </TouchableOpacity>
                </View>

                {/* Zoom Controls: +, 100%, - */}
                <View style={[styles.zoomCluster, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <TouchableOpacity
                    onPress={() => setTreeZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))))}
                    style={styles.panBtn}
                  >
                    <Text style={[styles.zoomBtnText, { color: theme.text }]}>＋</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleResetAll} style={{ paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.primary }}>
                      {Math.round(treeZoom * 100)}%
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setTreeZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
                    style={styles.panBtn}
                  >
                    <Text style={[styles.zoomBtnText, { color: theme.text }]}>－</Text>
                  </TouchableOpacity>
                </View>

                {/* Fullscreen Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setFullscreenTree(true)}
                  style={[styles.fullscreenBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
                >
                  <Ionicons name="expand-outline" size={14} color={theme.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.fullscreenBtnText, { color: theme.primary }]}>
                    મોટો વ્યુ
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2D Scrollable Tree Container (Vertical + Horizontal Scroll with Centered Content) */}
            <View style={[styles.tree2DViewport, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              {Platform.OS === 'web' ? (
                <ScrollView
                  ref={webScrollRef as any}
                  style={styles.treeWeb2DScroll}
                  contentContainerStyle={styles.treeWeb2DContent}
                  onScroll={(e) => {
                    setScrollX(e.nativeEvent.contentOffset.x);
                    setScrollY(e.nativeEvent.contentOffset.y);
                  }}
                  scrollEventThrottle={16}
                  showsVerticalScrollIndicator={true}
                  showsHorizontalScrollIndicator={true}
                >
                  <View
                    style={{
                      width: Math.round(treeLayoutSize.width * Math.max(1, treeZoom) + 140),
                      minHeight: Math.round(treeLayoutSize.height * Math.max(1, treeZoom) + 140),
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      paddingTop: 36,
                      paddingBottom: Math.round(120 * Math.max(1, treeZoom)),
                      paddingHorizontal: 50,
                      alignSelf: 'center',
                      marginHorizontal: 'auto',
                    }}
                  >
                    <View
                      onLayout={(e) => {
                        const { width, height } = e.nativeEvent.layout;
                        if (width > 50 && height > 50) {
                          setTreeLayoutSize((prev) => {
                            if (Math.abs(prev.width - width) > 15 || Math.abs(prev.height - height) > 15) {
                              return { width: Math.round(width), height: Math.round(height) };
                            }
                            return prev;
                          });
                        }
                      }}
                      style={{
                        alignItems: 'center',
                        transform: [{ scale: treeZoom }],
                        ...(Platform.OS === 'web' ? ({ transformOrigin: 'top center' } as any) : {}),
                      }}
                    >
                      {treeData.rootUnits.map((rootNode) => (
                        <TreeNodeComponent
                          key={rootNode.member.id}
                          node={rootNode}
                          onSelectMember={(m) => setSelectedMember(m)}
                        />
                      ))}
                    </View>
                  </View>
                </ScrollView>
              ) : (
                <ScrollView
                  ref={verticalScrollRef}
                  nestedScrollEnabled={true}
                  style={styles.treeVerticalScroll}
                  contentContainerStyle={styles.treeVerticalContent}
                  onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
                  scrollEventThrottle={16}
                  showsVerticalScrollIndicator={true}
                >
                  <ScrollView
                    ref={horizontalScrollRef}
                    horizontal
                    nestedScrollEnabled={true}
                    style={styles.treeHorizontalScroll}
                    contentContainerStyle={styles.treeHorizontalContent}
                    onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
                    scrollEventThrottle={16}
                    showsHorizontalScrollIndicator={true}
                  >
                    <View
                      style={{
                        width: Math.round(treeLayoutSize.width * Math.max(1, treeZoom) + 140),
                        minHeight: Math.round(treeLayoutSize.height * Math.max(1, treeZoom) + 140),
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        paddingTop: 36,
                        paddingBottom: Math.round(120 * Math.max(1, treeZoom)),
                        paddingHorizontal: 50,
                        alignSelf: 'center',
                        marginHorizontal: 'auto',
                      }}
                    >
                      <View
                        onLayout={(e) => {
                          const { width, height } = e.nativeEvent.layout;
                          if (width > 50 && height > 50) {
                            setTreeLayoutSize((prev) => {
                              if (Math.abs(prev.width - width) > 15 || Math.abs(prev.height - height) > 15) {
                                return { width: Math.round(width), height: Math.round(height) };
                              }
                              return prev;
                            });
                          }
                        }}
                        style={{
                          alignItems: 'center',
                          transform: [{ scale: treeZoom }],
                        }}
                      >
                        {treeData.rootUnits.map((rootNode) => (
                          <TreeNodeComponent
                            key={rootNode.member.id}
                            node={rootNode}
                            onSelectMember={(m) => setSelectedMember(m)}
                          />
                        ))}
                      </View>
                    </View>
                  </ScrollView>
                </ScrollView>
              )}
            </View>

            {/* Hint bar below tree */}
            <View style={styles.scrollHintBar}>
              <Text style={[styles.scrollHintText, { color: theme.textSecondary }]}>
                ↔️ ↕️ સ્ક્રોલ કરવા માટે ઉપર-નીચે-ડાબે-જમણે સ્વાઇપ કરો અથવા કંટ્રોલ બટનનો ઉપયોગ કરો
              </Text>
            </View>
          </Card>
        ) : null}

        {/* Verification & ID Info */}
        <Card style={styles.verifyCard}>
          <View style={styles.verifyRow}>
            <Ionicons name="shield-checkmark" size={24} color="#16A34A" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.verifyTitle, { color: theme.text }]}>
                Official Community Census Record
              </Text>
              <Text style={[styles.verifySubtitle, { color: theme.textSecondary }]}>
                Verified and securely stored in the Community Family Directory system.
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Tap Node Profile Modal */}
      <MemberProfileModal
        member={selectedMember}
        visible={selectedMember !== null}
        onClose={() => setSelectedMember(null)}
      />

      {/* Fullscreen Interactive 2D Tree Modal (Exact experience of tree.tsx) */}
      {treeData && (
        <Modal
          visible={fullscreenTree}
          animationType="slide"
          onRequestClose={() => setFullscreenTree(false)}
        >
          <View style={[styles.fullscreenModal, { backgroundColor: theme.background }]}>
            {/* Modal Header */}
            <View style={[styles.fullscreenHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fullscreenTitle, { color: theme.text }]}>
                  🌳 {family.family_code} • કુટુંબ વંશાવલી
                </Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                  પૂર્ણ સ્ક્રીન 2D વ્યૂ (બધી બાજુ સ્ક્રોલ કરો)
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setFullscreenTree(false)}
                style={[styles.closeModalBtn, { backgroundColor: theme.backgroundElement }]}
              >
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Floating Zoom & Pan Toolbar exactly like tree.tsx */}
            <View style={[styles.floatingZoomBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TouchableOpacity
                style={styles.floatingZoomBtn}
                onPress={() => setTreeZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))))}
              >
                <Text style={[styles.zoomBtnText, { color: theme.text }]}>＋</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.floatingZoomBtn}
                onPress={() => setTreeZoom(1)}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary }}>
                  {Math.round(treeZoom * 100)}%
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.floatingZoomBtn}
                onPress={() => setTreeZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
              >
                <Text style={[styles.zoomBtnText, { color: theme.text }]}>－</Text>
              </TouchableOpacity>
            </View>

            {/* Fullscreen 2D Pan Canvas */}
            {Platform.OS === 'web' ? (
              <ScrollView
                style={styles.fullscreenWeb2DScroll}
                contentContainerStyle={styles.fullscreenWeb2DContent}
                showsVerticalScrollIndicator={true}
                showsHorizontalScrollIndicator={true}
              >
                <View
                  style={{
                    width: Math.round(treeLayoutSize.width * Math.max(1, treeZoom) + 160),
                    minHeight: Math.round(treeLayoutSize.height * Math.max(1, treeZoom) + 160),
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    paddingTop: 40,
                    paddingBottom: Math.round(140 * Math.max(1, treeZoom)),
                    paddingHorizontal: 60,
                    alignSelf: 'center',
                    marginHorizontal: 'auto',
                  }}
                >
                  <View
                    style={{
                      alignItems: 'center',
                      transform: [{ scale: treeZoom }],
                      ...(Platform.OS === 'web' ? ({ transformOrigin: 'top center' } as any) : {}),
                    }}
                  >
                    {treeData.rootUnits.map((rootNode) => (
                      <TreeNodeComponent
                        key={rootNode.member.id}
                        node={rootNode}
                        onSelectMember={(m) => setSelectedMember(m)}
                      />
                    ))}
                  </View>
                </View>
              </ScrollView>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1, paddingVertical: 40 }}
                maximumZoomScale={2}
                minimumZoomScale={0.5}
                nestedScrollEnabled={true}
              >
                <ScrollView
                  horizontal
                  style={{ flex: 1 }}
                  contentContainerStyle={{
                    flexGrow: 1,
                    paddingHorizontal: 40,
                    minWidth: '100%',
                    alignItems: 'flex-start',
                  }}
                  nestedScrollEnabled={true}
                  showsHorizontalScrollIndicator={true}
                >
                  <View
                    style={{
                      width: Math.round(treeLayoutSize.width * Math.max(1, treeZoom) + 160),
                      minHeight: Math.round(treeLayoutSize.height * Math.max(1, treeZoom) + 160),
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      paddingTop: 40,
                      paddingBottom: Math.round(140 * Math.max(1, treeZoom)),
                      paddingHorizontal: 60,
                      alignSelf: 'center',
                      marginHorizontal: 'auto',
                    }}
                  >
                    <View
                      style={{
                        alignItems: 'center',
                        transform: [{ scale: treeZoom }],
                      }}
                    >
                      {treeData.rootUnits.map((rootNode) => (
                        <TreeNodeComponent
                          key={rootNode.member.id}
                          node={rootNode}
                          onSelectMember={(m) => setSelectedMember(m)}
                        />
                      ))}
                    </View>
                  </View>
                </ScrollView>
              </ScrollView>
            )}
          </View>
        </Modal>
      )}

      {/* BottomTabBar only when not opened via scanned QR code */}
      {!targetCode ? <BottomTabBar /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  centerBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodyScroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 920,
    width: '100%',
    alignSelf: 'center',
  },
  detailsCard: {
    padding: 16,
    marginTop: 14,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
  },
  memberRelation: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  treeCard: {
    padding: 16,
    marginTop: 14,
  },
  treeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  controlsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  panControlCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  zoomCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  panBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  fullscreenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  fullscreenBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  tree2DViewport: {
    borderWidth: 1,
    borderRadius: 12,
    height: 540,
    overflow: 'hidden',
    width: '100%',
  },
  treeWeb2DScroll: {
    flex: 1,
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web'
      ? ({
          overflow: 'auto',
          overflowX: 'auto',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        } as any)
      : {}),
  },
  treeWeb2DContent: {
    minWidth: '100%',
    minHeight: '100%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  treeVerticalScroll: {
    flex: 1,
  },
  treeVerticalContent: {
    flexGrow: 1,
  },
  treeHorizontalScroll: {
    minWidth: '100%',
    flexGrow: 1,
  },
  treeHorizontalContent: {
    minWidth: '100%',
    flexGrow: 1,
    alignItems: 'flex-start',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  fullscreenWeb2DScroll: {
    flex: 1,
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web'
      ? ({
          overflow: 'auto',
          overflowX: 'auto',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        } as any)
      : {}),
  },
  fullscreenWeb2DContent: {
    minWidth: '100%',
    minHeight: '100%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  scrollHintBar: {
    marginTop: 10,
    alignItems: 'center',
  },
  scrollHintText: {
    fontSize: 11.5,
    textAlign: 'center',
    fontWeight: '500',
  },
  fullscreenModal: {
    flex: 1,
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  fullscreenTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeModalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingZoomBar: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 30,
    elevation: 6,
    boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.18)',
  },
  floatingZoomBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyCard: {
    padding: 14,
    marginTop: 14,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  verifySubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
