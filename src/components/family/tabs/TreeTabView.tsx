import React, { useRef, useState } from 'react';
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
import { Family, FamilyMember } from '@/types/database';
import { TreeDataStructure } from '@/features/tree/treeBuilder';
import { TreeNodeComponent } from '@/components/tree/TreeNodeComponent';
import { MemberProfileModal } from '@/components/tree/MemberProfileModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Ionicons } from '@expo/vector-icons';

import { exportTreeAsImage } from '@/lib/utils/exportTree';

export interface TreeTabViewProps {
  family: Family | null;
  treeData: TreeDataStructure | null;
}

export function TreeTabView({ family, treeData }: TreeTabViewProps) {
  const router = useRouter();
  const theme = useTheme();
  const viewShotRef = useRef<any>(null);

  const [zoomScale, setZoomScale] = useState<number>(1);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [exporting, setExporting] = useState(false);

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

  if (!family || !treeData || treeData.rootUnits.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <EmptyState
          icon={<Text style={{ fontSize: 48, marginBottom: 8 }}>🌳</Text>}
          title="No Family Tree Yet"
          description="Register your family and add members to automatically generate your interactive generational family tree."
          actionTitle="+ Add Family Member / સભ્ય ઉમેરો"
          onAction={() => router.push(family ? ('/(family)/add-member' as any) : ('/(family)/setup-family' as any))}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Floating Mini-Bar (Export + Link) */}
      <View style={[styles.topActionsBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleExportTree}
          disabled={exporting}
          style={[styles.actionPill, { backgroundColor: theme.primaryLight }]}
        >
          <Ionicons name="camera-outline" size={16} color={theme.primary} />
          <Text style={[styles.actionPillText, { color: theme.primary, marginLeft: 4 }]}>
            {exporting ? 'Exporting Image...' : '📸 Export Tree Image'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/(family)/manage-relationships' as any)}
          style={[styles.actionPill, { backgroundColor: theme.backgroundElement, marginLeft: 8 }]}
        >
          <Ionicons name="link-outline" size={16} color={theme.text} />
          <Text style={[styles.actionPillText, { color: theme.text, marginLeft: 4 }]}>
            Link Relations
          </Text>
        </TouchableOpacity>
      </View>

      {/* Floating Zoom Controls */}
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

      {/* Tap Node Profile Modal */}
      <MemberProfileModal
        member={selectedMember}
        visible={selectedMember !== null}
        onClose={() => setSelectedMember(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    zIndex: 5,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  zoomToolbar: {
    position: 'absolute',
    bottom: 24,
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
  },
  treeCanvas: {
    alignItems: 'center',
    padding: 20,
    minWidth: '100%',
    ...(Platform.OS === 'web' ? ({ transformOrigin: 'top center' } as any) : {}),
  },
});
