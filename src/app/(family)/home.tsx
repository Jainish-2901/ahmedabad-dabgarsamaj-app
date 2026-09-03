import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '@/constants/theme';
import { familyService } from '@/features/family/familyService';
import { relationshipsService } from '@/features/tree/relationshipsService';
import { buildFamilyTree, TreeDataStructure } from '@/features/tree/treeBuilder';
import { Family, FamilyMember } from '@/types/database';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { TopBar } from '@/components/navigation/TopBar';
import { BottomTabBar, TabId } from '@/components/navigation/BottomTabBar';
import { HomeTabView } from '@/components/family/tabs/HomeTabView';
import { BookletTabView } from '@/components/family/tabs/BookletTabView';
import { MembersTabView } from '@/components/family/tabs/MembersTabView';
import { TreeTabView } from '@/components/family/tabs/TreeTabView';
import { CardTabView } from '@/components/family/tabs/CardTabView';

import { useAuth } from '@/features/auth/AuthContext';

export default function FamilyMasterScreen() {
  const theme = useTheme();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [treeData, setTreeData] = useState<TreeDataStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = async (targetUserId?: string) => {
    setErrorMessage('');
    const res = await familyService.getMyFamily(targetUserId || user?.id);
    if (res.error) {
      setErrorMessage(res.error);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setFamily(res.family);
    setMembers(res.members);

    if (res.family) {
      const relRes = await relationshipsService.getFamilyRelationships(res.family.id);
      const constructed = buildFamilyTree(res.members, relRes.relationships);
      setTreeData(constructed);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!isAuthLoading) {
      loadData(user?.id);
    }
  }, [isAuthLoading, user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(user?.id);
  };

  if (isAuthLoading || (loading && !family && !errorMessage)) {
    return <LoadingState message="Loading your family dashboard..." />;
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={loadData} />;
  }

  const getTabTitle = () => {
    switch (activeTab) {
      case 'home':
        return 'અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા';
      case 'booklet':
        return 'અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા';
      case 'members':
        return 'Family Members / સભ્યો';
      case 'tree':
        return 'Family Tree / ફેમિલી ટ્રી';
      case 'card':
        return 'Digital Family Card';
      default:
        return 'અમદાવાદ ડબગર સમાજ પરિચય પુસ્તિકા';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Permanent Persistent TopBar */}
      <TopBar title={getTabTitle()} />

      {/* Main Active Tab Content View (Instant, Zero Page Reload) */}
      <View style={styles.tabContentContainer}>
        {activeTab === 'home' && (
          <HomeTabView
            family={family}
            members={members}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'booklet' && (
          <BookletTabView />
        )}

        {activeTab === 'members' && (
          <MembersTabView members={members} />
        )}

        {activeTab === 'tree' && (
          <TreeTabView family={family} treeData={treeData} />
        )}

        {activeTab === 'card' && (
          <CardTabView
            family={family}
            members={members}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}
      </View>

      {/* Permanent Persistent BottomTabBar */}
      <BottomTabBar
        activeTab={activeTab}
        onSelectTab={(tabId) => setActiveTab(tabId)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContentContainer: {
    flex: 1,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
});
