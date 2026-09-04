import React, { useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/constants/theme';
import {
  CommunityFamilyBookletItem,
  CommunityStats,
  directoryService,
} from '@/features/directory/directoryService';
import { familyService } from '@/features/family/familyService';
import { Area } from '@/types/database';
import { BookletCard } from '@/components/booklet/BookletCard';
import { FamilyBookletDetailModal } from '@/components/booklet/FamilyBookletDetailModal';
import { Card } from '@/components/ui/Card';
import { BookletScreenSkeleton } from '@/components/ui/Skeleton';
import { exportCommunityDirectoryAsPdf, printCommunityDirectoryDirectly } from '@/lib/utils/exportPdf';
import { Ionicons } from '@expo/vector-icons';

export function BookletTabView() {
  const theme = useTheme();

  const [families, setFamilies] = useState<CommunityFamilyBookletItem[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Deep detail modal state
  const [selectedBookletItem, setSelectedBookletItem] = useState<CommunityFamilyBookletItem | null>(null);
  const [exportingDir, setExportingDir] = useState(false);

  const handleExportDirectoryPdf = async () => {
    if (families.length === 0) return;
    setExportingDir(true);
    await exportCommunityDirectoryAsPdf(
      families.map((f) => ({
        ...f.family,
        members: f.members,
        head_name: f.headMember?.name,
        area_name: f.family.area?.name,
      }))
    );
    setExportingDir(false);
  };

  const handlePrintDirectory = async () => {
    if (families.length === 0) return;
    await printCommunityDirectoryDirectly(
      families.map((f) => ({
        ...f.family,
        members: f.members,
        head_name: f.headMember?.name,
        area_name: f.family.area?.name,
      }))
    );
  };

  const loadData = async (query = searchQuery, areaId = selectedAreaId) => {
    const [areaRes, famRes, statsRes] = await Promise.all([
      familyService.getAreas(),
      directoryService.getAllCommunityFamilies({
        searchQuery: query,
        areaId,
      }),
      directoryService.getCommunityStats(),
    ]);

    setAreas(areaRes.data);
    setFamilies(famRes.data);
    setStats(statsRes);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    loadData(text, selectedAreaId);
  };

  const handleAreaSelect = (areaId: string) => {
    setSelectedAreaId(areaId);
    loadData(searchQuery, areaId);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search & Area Filter Header */}
      <View style={[styles.filterSection, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput
            placeholder="Search by Name, Blood Group, Village, Job, Edu..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={handleSearchChange}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Horizontal Area Scroll Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.areaScrollContent}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleAreaSelect('all')}
            style={[
              styles.areaPill,
              {
                backgroundColor: selectedAreaId === 'all' ? theme.primary : theme.backgroundElement,
                borderColor: selectedAreaId === 'all' ? theme.primary : theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.areaPillText,
                { color: selectedAreaId === 'all' ? '#FFFFFF' : theme.text },
              ]}
            >
              All Areas / તમામ વિસ્તારો
            </Text>
          </TouchableOpacity>

          {areas.map((a) => (
            <TouchableOpacity
              key={a.id}
              activeOpacity={0.7}
              onPress={() => handleAreaSelect(a.id)}
              style={[
                styles.areaPill,
                {
                  backgroundColor: selectedAreaId === a.id ? theme.primary : theme.backgroundElement,
                  borderColor: selectedAreaId === a.id ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.areaPillText,
                  { color: selectedAreaId === a.id ? '#FFFFFF' : theme.text },
                ]}
              >
                {a.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Loading Skeleton or Directory Booklet FlatList */}
      {loading ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
          }
        >
          <BookletScreenSkeleton />
        </ScrollView>
      ) : (
        <FlatList
          data={families}
          keyExtractor={(item) => item.family.id}
          renderItem={({ item }) => (
            <BookletCard
              item={item}
              searchQuery={searchQuery}
              onPressDetails={() => setSelectedBookletItem(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
          }
          ListHeaderComponent={
            <>
              {stats ? (
                <Card style={styles.statsBanner}>
                  <View style={styles.statsRow}>
                    <View style={styles.statsItem}>
                      <Text style={[styles.statsNumber, { color: theme.primary }]}>
                        {stats.totalFamilies}
                      </Text>
                      <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>
                        કુલ પરિવારો / Families
                      </Text>
                    </View>

                    <View style={[styles.statsDivider, { backgroundColor: theme.border }]} />

                    <View style={styles.statsItem}>
                      <Text style={[styles.statsNumber, { color: theme.accent }]}>
                        {stats.totalMembers}
                      </Text>
                      <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>
                        સમાજના સભ્યો / Members
                      </Text>
                    </View>

                    <View style={[styles.statsDivider, { backgroundColor: theme.border }]} />

                    <View style={styles.statsItem}>
                      <Text style={[styles.statsNumber, { color: theme.success }]}>
                        {families.length}
                      </Text>
                      <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>
                        ડિસ્પ્લે પરિણામ / Showing
                      </Text>
                    </View>
                  </View>
                </Card>
              ) : null}

              {/* Community PDF Export & Print Bar */}
              {families.length > 0 ? (
                <View style={styles.communityExportBar}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleExportDirectoryPdf}
                    disabled={exportingDir}
                    style={[styles.communityExportBtn, { backgroundColor: theme.primary }]}
                  >
                    <Ionicons name="document-text" size={16} color="#FFFFFF" />
                    <Text style={styles.communityExportBtnText}>
                      {exportingDir ? 'Generating PDF...' : `📄 Export Directory PDF (${families.length})`}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handlePrintDirectory}
                    style={[styles.communityPrintBtn, { borderColor: theme.primary, backgroundColor: theme.primaryLight }]}
                  >
                    <Ionicons name="print" size={16} color={theme.primary} />
                    <Text style={[styles.communityPrintBtnText, { color: theme.primary }]}>
                      🖨️ Print
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📖</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                કોઈ પરિવાર મળ્યો નથી / No Families Found
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                બીજા નામ, વિસ્તાર કે સ્પેલિંગથી શોધવાનો પ્રયત્ન કરો.
              </Text>
            </View>
          }
        />
      )}

      {/* Deep Family Booklet Detail Modal */}
      <FamilyBookletDetailModal
        visible={!!selectedBookletItem}
        item={selectedBookletItem}
        onClose={() => setSelectedBookletItem(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  areaScrollContent: {
    gap: 8,
    paddingBottom: 4,
  },
  areaPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  areaPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  statsBanner: {
    padding: 12,
    marginBottom: 16,
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statsItem: {
    alignItems: 'center',
    flex: 1,
  },
  statsNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  statsDivider: {
    width: 1,
    height: 28,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
  },
  communityExportBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  communityExportBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  communityExportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  communityPrintBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  communityPrintBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
