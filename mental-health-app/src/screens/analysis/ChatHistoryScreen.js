import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { analysisService } from '../../services';
import { EmptyState, ConfirmDialog } from '../../components/CommonComponents';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';

const HEALTH_CONFIG = {
  healthy: { color: COLORS.success, icon: 'check-circle', label: 'Healthy' },
  moderate: { color: COLORS.warning, icon: 'error-outline', label: 'Moderate' },
  concerning: { color: COLORS.error, icon: 'warning', label: 'Concerning' },
};

export default function ChatHistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await analysisService.getChatHistory(100);
      setHistory(Array.isArray(data) ? data : data?.analyses || []);
    } catch (err) {
      if (err.message !== 'UNAUTHORIZED') {
        Alert.alert('Error', 'Failed to load chat history');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await analysisService.deleteChatImport(deleteTarget);
      setHistory(prev => prev.filter(h => h.id !== deleteTarget));
    } catch {
      Alert.alert('Error', 'Failed to delete');
    }
    setDeleteTarget(null);
  }, [deleteTarget]);

  const renderItem = ({ item }) => {
    const date = new Date(item.created_at);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const totalMsgs = item.total_messages || item.analysis?.basic_stats?.total_messages || 0;
    const format = item.format_detected || 'unknown';
    const participants = item.analysis?.participants ? Object.entries(item.analysis.participants) : [];
    const durationDays = item.analysis?.conversation_period?.duration_days;
    const health = item.analysis?.red_flags?.overall_health;
    const healthConf = health ? (HEALTH_CONFIG[health] || null) : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ChatDetail', { chatId: item.id })}
        activeOpacity={0.7}
      >
        {/* Row 1: format badge + health badge + date/time */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.formatBadge}>
              <Text style={styles.formatText}>{format}</Text>
            </View>
            {healthConf && (
              <View style={[styles.healthBadge, { backgroundColor: healthConf.color + '18' }]}>
                <MaterialIcons name={healthConf.icon} size={12} color={healthConf.color} />
                <Text style={[styles.healthText, { color: healthConf.color }]}>{healthConf.label}</Text>
              </View>
            )}
          </View>
          <View style={styles.dateBlock}>
            <Text style={styles.dateText}>{dateStr}</Text>
            <Text style={styles.timeText}>{timeStr}</Text>
          </View>
        </View>

        {/* Row 2: stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalMsgs}</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{participants.length}</Text>
            <Text style={styles.statLabel}>People</Text>
          </View>
          {durationDays != null && (
            <View style={styles.stat}>
              <Text style={styles.statValue}>{durationDays}</Text>
              <Text style={styles.statLabel}>Days</Text>
            </View>
          )}
        </View>

        {/* Row 3: participant names */}
        {participants.length > 0 && (
          <View style={styles.participantsRow}>
            {participants.slice(0, 4).map(([name, info]) => (
              <View key={name} style={styles.participantChip}>
                <MaterialIcons name="person" size={11} color={COLORS.primary} />
                <Text style={styles.participantName} numberOfLines={1}>
                  {name}
                  {info?.message_count ? ` (${info.message_count})` : ''}
                </Text>
              </View>
            ))}
            {participants.length > 4 && (
              <Text style={styles.moreParticipants}>+{participants.length - 4} more</Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => setDeleteTarget(item.id)}
        >
          <MaterialIcons name="delete-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (!loading && history.length === 0) {
    return (
      <EmptyState
        iconName="chat-bubble-outline"
        title="No Chat Imports"
        message="Import a chat to see analysis here."
        actionLabel="Import Chat"
        onAction={() => navigation.navigate('ChatImport')}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id || Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadHistory} colors={[COLORS.primary]} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete Chat Import"
        message="This will permanently delete this chat analysis."
        confirmText="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.lg },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  headerLeft: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, flex: 1 },
  formatBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  formatText: { ...FONTS.semiBold, fontSize: FONTS.sizes.sm, color: COLORS.primary, textTransform: 'capitalize' },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  healthText: { ...FONTS.semiBold, fontSize: FONTS.sizes.xs },
  dateBlock: { alignItems: 'flex-end', marginLeft: SPACING.sm },
  dateText: { ...FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textLight },
  timeText: { ...FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginTop: 1 },
  statsRow: { flexDirection: 'row', gap: SPACING.xl, marginBottom: SPACING.sm },
  stat: { alignItems: 'center' },
  statValue: { ...FONTS.bold, fontSize: FONTS.sizes.xl, color: COLORS.text },
  statLabel: { ...FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  participantsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  participantName: { ...FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, maxWidth: 100 },
  moreParticipants: { ...FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textLight, alignSelf: 'center' },
  deleteBtn: { position: 'absolute', right: SPACING.md, bottom: SPACING.md, padding: SPACING.xs },
  separator: { height: SPACING.md },
});
