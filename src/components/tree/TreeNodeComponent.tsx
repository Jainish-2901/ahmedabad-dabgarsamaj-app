import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/constants/theme';
import { FamilyMember } from '@/types/database';
import { TreePersonNode } from '@/features/tree/treeBuilder';
import { Avatar } from '@/components/ui/Avatar';
import { formatAgeShort } from '@/lib/utils/date';

export interface TreeNodeComponentProps {
  node: TreePersonNode;
  onSelectMember: (member: FamilyMember) => void;
}

export function TreeNodeComponent({
  node,
  onSelectMember,
}: TreeNodeComponentProps) {
  const theme = useTheme();

  const renderSingleCard = (member: FamilyMember) => {
    const isDeceased = member.is_deceased === true || (member as any).status === 'DECEASED';
    const displayName = isDeceased ? `સ્વ. ${member.name}` : member.name;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onSelectMember(member)}
        style={[
          styles.nodeCard,
          {
            backgroundColor: isDeceased ? theme.backgroundElement : theme.card,
            borderColor: isDeceased ? '#94A3B8' : theme.border,
            opacity: isDeceased ? 0.95 : 1,
          },
        ]}
      >
        <Avatar
          name={member.name}
          photoUrl={member.photo_url}
          gender={member.gender}
          size={44}
        />
        <Text numberOfLines={1} style={[styles.nodeName, { color: theme.text }]}>
          {displayName}
        </Text>
        <Text style={[styles.nodeRelation, { color: isDeceased ? '#64748B' : theme.primary }]}>
          {member.display_relation?.split('/')[0].trim() || member.relation}
        </Text>
        {isDeceased ? (
          <Text style={[styles.nodeAge, { color: '#64748B', fontWeight: '700' }]}>
            🕊️ સ્વર્ગસ્થ
          </Text>
        ) : (
          <Text style={[styles.nodeAge, { color: theme.textSecondary }]}>
            {formatAgeShort(member.dob, member.age)}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const hasChildren = node.children && node.children.length > 0;
  const isOnlyChildNode = node.children && node.children.length === 1;

  return (
    <View style={styles.treeBranchContainer}>
      {/* Couple or Single Parent Unit */}
      <View style={styles.coupleRow}>
        {renderSingleCard(node.member)}

        {node.spouse ? (
          <>
            <View style={styles.spouseConnector}>
              <View style={[styles.spouseLine, { backgroundColor: theme.primary }]} />
              <Text style={styles.heartIcon}>💍</Text>
              <View style={[styles.spouseLine, { backgroundColor: theme.primary }]} />
            </View>
            {renderSingleCard(node.spouse)}
          </>
        ) : null}
      </View>

      {/* Children Hierarchy Lines & Nodes */}
      {hasChildren ? (
        <View style={styles.childrenContainer}>
          {/* Vertical stem down from parent unit */}
          <View style={[styles.parentVerticalStem, { backgroundColor: theme.border }]} />

          {/* Children row with bulletproof local horizontal connectors */}
          <View style={styles.childrenRow}>
            {node.children!.map((childNode, index) => {
              const isFirst = index === 0;
              const isLast = index === node.children!.length - 1;

              return (
                <View key={childNode.member.id} style={styles.childColumn}>
                  {/* Top connector bar for multi-child families */}
                  {!isOnlyChildNode ? (
                    <View style={styles.horizontalConnectorRow}>
                      <View
                        style={[
                          styles.horizontalHalfBar,
                          { backgroundColor: isFirst ? 'transparent' : theme.border },
                        ]}
                      />
                      <View
                        style={[
                          styles.horizontalHalfBar,
                          { backgroundColor: isLast ? 'transparent' : theme.border },
                        ]}
                      />
                    </View>
                  ) : null}

                  {/* Vertical line connecting to child */}
                  <View style={[styles.childVerticalStem, { backgroundColor: theme.border }]} />

                  {/* Recursive Child Branch */}
                  <TreeNodeComponent
                    node={childNode}
                    onSelectMember={onSelectMember}
                  />
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  treeBranchContainer: {
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 6,
    flexShrink: 0,
  },
  coupleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  nodeCard: {
    width: 124,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.06)',
    elevation: 2,
    flexShrink: 0,
  },
  nodeName: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  nodeRelation: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  nodeAge: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  spouseConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
    flexShrink: 0,
  },
  spouseLine: {
    width: 14,
    height: 2,
  },
  heartIcon: {
    fontSize: 12,
    marginHorizontal: 2,
  },
  childrenContainer: {
    alignItems: 'center',
    flexShrink: 0,
    width: '100%',
  },
  parentVerticalStem: {
    width: 2,
    height: 18,
  },
  childrenRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexShrink: 0,
  },
  childColumn: {
    alignItems: 'center',
    flexShrink: 0,
  },
  horizontalConnectorRow: {
    flexDirection: 'row',
    width: '100%',
    height: 2,
  },
  horizontalHalfBar: {
    flex: 1,
    height: 2,
  },
  childVerticalStem: {
    width: 2,
    height: 16,
  },
});
