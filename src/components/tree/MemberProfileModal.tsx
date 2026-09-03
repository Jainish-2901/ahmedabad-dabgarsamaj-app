import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/constants/theme';
import { FamilyMember } from '@/types/database';
import { formatDate, formatAgeShort } from '@/lib/utils/date';
import { getOccupationDisplay } from '@/constants/occupations';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface MemberProfileModalProps {
  member: FamilyMember | null;
  visible: boolean;
  onClose: () => void;
  onNavigate?: (memberId: string) => void;
}

export function MemberProfileModal({
  member,
  visible,
  onClose,
  onNavigate,
}: MemberProfileModalProps) {
  const router = useRouter();
  const theme = useTheme();

  if (!member) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme.backgroundElement }]}
            onPress={onClose}
          >
            <Text style={[styles.closeText, { color: theme.textSecondary }]}>✕</Text>
          </TouchableOpacity>

          {/* Profile Header */}
          <View style={styles.header}>
            <Avatar
              name={member.name}
              photoUrl={member.photo_url}
              gender={member.gender}
              size={64}
              enablePreview={true}
              subtitle={member.display_relation || member.relation}
            />
            <Text style={[styles.name, { color: theme.text }]}>
              {member.is_deceased ? `🕊️ સ્વ. ${member.name}` : member.name}
            </Text>
            <Text style={[styles.relation, { color: theme.primary }]}>
              {member.display_relation || member.relation}
            </Text>
            <View style={styles.badgeRow}>
              <Badge
                label={member.gender}
                variant={member.gender === 'Female' ? 'warning' : 'primary'}
                size="sm"
              />
              {member.is_deceased ? (
                <Badge
                  label="🕊️ સ્વર્ગસ્થ (Late)"
                  variant="neutral"
                  size="sm"
                  style={{ marginLeft: 6 }}
                />
              ) : (
                member.dob || member.age !== undefined ? (
                  <Badge
                    label={formatAgeShort(member.dob, member.age)}
                    variant="neutral"
                    size="sm"
                    style={{ marginLeft: 6 }}
                  />
                ) : null
              )}
            </View>
          </View>

          {/* Details List */}
          <View style={[styles.detailsBox, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                Status / સ્થિતિ:
              </Text>
              <Text style={[styles.detailValue, { color: member.is_deceased ? '#64748B' : '#16A34A', fontWeight: '700' }]}>
                {member.is_deceased ? '🕊️ સ્વર્ગસ્થ / Deceased (Late)' : '🟢 હયાત / Living'}
              </Text>
            </View>

            {member.deceased_date ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  સ્વર્ગવાસ તારીખ:
                </Text>
                <Text style={[styles.detailValue, { color: theme.text, fontWeight: '700' }]}>
                  🕊️ {formatDate(member.deceased_date) || member.deceased_date}
                </Text>
              </View>
            ) : null}

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                Date of Birth:
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {formatDate(member.dob)}
              </Text>
            </View>

            {member.mobile ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Mobile:
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  📞 {member.mobile}
                </Text>
              </View>
            ) : null}

            {member.education_status ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Education:
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {member.education_status}
                </Text>
              </View>
            ) : null}

            {member.occupation_type ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                  Occupation:
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {getOccupationDisplay(member.occupation_type)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Footer Action */}
          <Button
            title="View Full Profile / સંપૂર્ણ વિગત →"
            onPress={() => {
              onClose();
              if (onNavigate) {
                onNavigate(member.id);
              } else {
                router.push(`/(family)/member/${member.id}` as any);
              }
            }}
            size="md"
            style={styles.actionBtn}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.15)',
    elevation: 6,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  header: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
  relation: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  detailsBox: {
    width: '100%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtn: {
    width: '100%',
  },
});
