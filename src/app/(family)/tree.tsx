import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/constants/theme';
import { familyService } from '@/features/family/familyService';
import { relationshipsService } from '@/features/tree/relationshipsService';
import { buildFamilyTree, TreeDataStructure } from '@/features/tree/treeBuilder';
import { Family, FamilyMember } from '@/types/database';
import { exportTreeAsImage } from '@/lib/utils/exportTree';
import { TreeNodeComponent } from '@/components/tree/TreeNodeComponent';
import { MemberProfileModal } from '@/components/tree/MemberProfileModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { TopBar } from '@/components/navigation/TopBar';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/AuthContext';

export default function FamilyTreeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const viewShotRef = useRef<any>(null);

  const [family, setFamily] = useState<Family | null>(null);
  const [treeData, setTreeData] = useState<TreeDataStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

  const loadTree = async () => {
    setError('');
    if (!user?.id) {
      setFamily(null);
      setTreeData(null);
      setLoading(false);
      return;
    }

    const famRes = await familyService.getMyFamily(user.id);
    if (famRes.error) {
      setError(famRes.error);
      setLoading(false);
      return;
    }

    if (!famRes.family) {
      setFamily(null);
      setTreeData(null);
      setLoading(false);
      return;
    }

    setFamily(famRes.family);

    const relRes = await relationshipsService.getFamilyRelationships(famRes.family.id);
    const constructed = buildFamilyTree(famRes.members, relRes.relationships);
    setTreeData(constructed);
    setLoading(false);
  };

  useEffect(() => {
    loadTree();
  }, [user?.id]);

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(1.8, prev + 0.15));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(0.6, prev - 0.15));
  };

  const handleResetZoom = () => {
    setZoomScale(1);
  };

  const handleExportTree = async () => {
    setExporting(true);
    await exportTreeAsImage(viewShotRef, `family-tree-${family?.family_code || 'export'}`);
    setExporting(false);
  };

  if (loading) {
    return <LoadingState message="Constructing interactive family tree..." />;
  }

  if (!family || !treeData || treeData.rootUnits.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <TopBar title="Family Tree / ફેમિલી ટ્રી" />
        <View style={styles.centerBody}>
          <EmptyState
            icon={<Text style={{ fontSize: 48, marginBottom: 8 }}>🌳</Text>}
            title="No Family Tree Yet"
            description="Register your family and add members to automatically generate your interactive generational family tree."
            actionTitle="+ Add Family Member / સભ્ય ઉમેરો"
            onAction={() => router.push(family ? ('/(family)/add-member' as any) : ('/(family)/setup-family' as any))}
          />
        </View>
        <BottomTabBar />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* TopBar with Export and Link buttons */}
      <TopBar
        title="Family Tree / ફેમિલી ટ્રી"
        rightAction={
          <View style={styles.topRightRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleExportTree}
              disabled={exporting}
              style={[styles.exportBtn, { backgroundColor: theme.primaryLight }]}
            >
              <Ionicons name="camera-outline" size={16} color={theme.primary} />
              <Text style={[styles.exportText, { color: theme.primary, marginLeft: 4 }]}>
                {exporting ? 'Saving...' : 'Export Image'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(family)/manage-relationships' as any)}
              style={[styles.linkBtn, { backgroundColor: theme.backgroundElement }]}
            >
              <Ionicons name="link-outline" size={16} color={theme.text} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Floating Zoom & Pan Toolbar */}
      <View style={[styles.zoomToolbar, { backgroundColor: theme.card, borderColor: theme.border }]}>
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

      {/* 2D Pan Canvas (Vertical + Horizontal Scroll) */}
      <ScrollView
        style={styles.canvasVertical}
        contentContainerStyle={styles.canvasVerticalContent}
        maximumZoomScale={2}
        minimumZoomScale={0.5}
      >
        <ScrollView
          horizontal
          style={styles.canvasHorizontal}
          contentContainerStyle={styles.canvasHorizontalContent}
          showsHorizontalScrollIndicator={false}
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
            <View nativeID="family-tree-capture-root" style={{ alignItems: 'center' }}>
              {treeData.rootUnits.map((rootNode) => (
                <TreeNodeComponent
                  key={rootNode.member.id}
                  node={rootNode}
                  onSelectMember={(m) => setSelectedMember(m)}
                />
              ))}
            </View>
          </ViewShot>
        </ScrollView>
      </ScrollView>

      {/* Tap Node Profile Modal (Req 17) */}
      <MemberProfileModal
        member={selectedMember}
        visible={selectedMember !== null}
        onClose={() => setSelectedMember(null)}
      />

      {/* Bottom Navigation */}
      <BottomTabBar />
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
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  exportText: {
    fontSize: 12,
    fontWeight: '700',
  },
  linkBtn: {
    padding: 6,
    borderRadius: 8,
  },
  zoomToolbar: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 20,
    elevation: 5,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
  },
  zoomBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
  zoomResetText: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  canvasVertical: {
    flex: 1,
  },
  canvasVerticalContent: {
    flexGrow: 1,
    paddingVertical: 30,
  },
  canvasHorizontal: {
    flex: 1,
  },
  canvasHorizontalContent: {
    flexGrow: 1,
    paddingHorizontal: 40,
    minWidth: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  treeCanvas: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 'auto',
    alignSelf: 'center',
    padding: 20,
    minWidth: '100%',
    ...(Platform.OS === 'web' ? ({ transformOrigin: 'top center' } as any) : {}),
  },
});
