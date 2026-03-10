import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { analysisService } from '../../services';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';

const HEALTH_CONFIG = {
  healthy:    { color: COLORS.success, icon: 'check-circle',  label: 'Healthy',    bg: '#10B98112' },
  moderate:   { color: COLORS.warning, icon: 'error-outline', label: 'Moderate',   bg: '#F59E0B12' },
  concerning: { color: COLORS.error,   icon: 'warning',       label: 'Concerning', bg: '#EF444412' },
};

export default function ChatDetailScreen({ route }) {
  const { chatId } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await analysisService.getChatAnalysisById(chatId);
        setData(result);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [chatId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="error-outline" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>Failed to load chat analysis</Text>
      </View>
    );
  }

  const a = data.analysis || data;
  const health = a?.red_flags?.overall_health;
  const healthConf = health ? (HEALTH_CONFIG[health] || null) : null;
  const totalMsgs = data.total_messages || a?.basic_stats?.total_messages || 0;
  const importDate = data.created_at ? new Date(data.created_at).toLocaleString() : null;

  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return 'N/A';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    if (minutes < 1440) return `${(minutes / 60).toFixed(1)} hrs`;
    return `${(minutes / 1440).toFixed(1)} days`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Health status banner ── */}
      {healthConf && (
        <View style={[styles.healthBanner, { backgroundColor: healthConf.bg, borderColor: healthConf.color + '40' }]}>
          <MaterialIcons name={healthConf.icon} size={28} color={healthConf.color} />
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={[styles.healthBannerTitle, { color: healthConf.color }]}>
              {healthConf.label} Conversation
            </Text>
            {(a.red_flags?.total_red_flags > 0 || a.red_flags?.total_warnings > 0) ? (
              <Text style={styles.healthBannerSub}>
                {[a.red_flags.total_red_flags > 0 && `${a.red_flags.total_red_flags} red flag${a.red_flags.total_red_flags > 1 ? 's' : ''}`, a.red_flags.total_warnings > 0 && `${a.red_flags.total_warnings} warning${a.red_flags.total_warnings > 1 ? 's' : ''}`].filter(Boolean).join(', ')} detected
              </Text>
            ) : (
              <Text style={styles.healthBannerSub}>No concerning patterns found</Text>
            )}
          </View>
        </View>
      )}

      {/* ── Overview ── */}
      <SectionCard icon="bar-chart" title="Overview">
        <View style={styles.overviewGrid}>
          <StatBox label="Messages"     value={totalMsgs} />
          <StatBox label="Participants" value={Object.keys(a.participants || {}).length} />
          <StatBox label="Format"       value={data.format_detected || 'N/A'} small />
        </View>
        {(a.basic_stats?.average_message_length != null || a.basic_stats?.avg_message_length != null) && (
          <View style={styles.overviewExtra}>
            <MetricRow label="Avg message length" value={`${Math.round(a.basic_stats.average_message_length ?? a.basic_stats.avg_message_length)} chars`} />
          </View>
        )}
        {a.basic_stats?.longest_message?.length != null && (
          <View style={styles.overviewExtra}>
            <MetricRow label="Longest message" value={`${a.basic_stats.longest_message.length} chars`} />
          </View>
        )}
        {a.basic_stats?.messages_per_participant && Object.keys(a.basic_stats.messages_per_participant).length > 0 && (
          <View style={[styles.overviewExtra, { marginTop: SPACING.sm }]}>
            <Text style={styles.subSectionLabel}>Messages per person</Text>
            {Object.entries(a.basic_stats.messages_per_participant).map(([name, count]) => (
              <View key={name} style={styles.barRow}>
                <Text style={[styles.barLabel, { width: 80 }]} numberOfLines={1}>{name}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${totalMsgs > 0 ? Math.min((count / totalMsgs) * 100, 100) : 0}%`, backgroundColor: COLORS.primary }]} />
                </View>
                <Text style={styles.barPct}>{count}</Text>
              </View>
            ))}
          </View>
        )}
        {importDate && (
          <View style={styles.overviewExtra}>
            <MetricRow label="Imported" value={importDate} />
          </View>
        )}
      </SectionCard>

      {/* ── Conversation Period ── */}
      {a.conversation_period && (
        <SectionCard icon="date-range" title="Conversation Period">
          <View style={styles.periodRow}>
            <View style={styles.periodDate}>
              <Text style={styles.periodLabel}>Start</Text>
              <Text style={styles.periodValue}>
                {a.conversation_period.start
                  ? new Date(a.conversation_period.start).toLocaleDateString()
                  : a.conversation_period.start_date || 'N/A'}
              </Text>
            </View>
            <MaterialIcons name="arrow-forward" size={18} color={COLORS.textLight} />
            <View style={styles.periodDate}>
              <Text style={styles.periodLabel}>End</Text>
              <Text style={styles.periodValue}>
                {a.conversation_period.end
                  ? new Date(a.conversation_period.end).toLocaleDateString()
                  : a.conversation_period.end_date || 'N/A'}
              </Text>
            </View>
          </View>
          {a.conversation_period.duration_days != null && (
            <View style={[styles.periodDurationBadge]}>
              <Text style={styles.periodDurationText}>{a.conversation_period.duration_days} days total</Text>
            </View>
          )}
        </SectionCard>
      )}

      {/* ── Participants ── */}
      {a.participants && Object.keys(a.participants).length > 0 && (
        <SectionCard icon="people" title="Participants">
          {Object.entries(a.participants).map(([name, info]) => {
            const count = info?.message_count ?? (typeof info === 'number' ? info : 0);
            const pct = totalMsgs > 0 ? Math.round((count / totalMsgs) * 100) : 0;
            const isYou = info?.role === 'you';
            return (
              <View key={name} style={styles.participantRow}>
                <View style={styles.participantInfo}>
                  <View style={styles.participantNameRow}>
                    <Text style={styles.participantName}>{name}</Text>
                    {isYou && (
                      <View style={styles.youBadge}>
                        <Text style={styles.youBadgeText}>You</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.pctBarTrack}>
                    <View style={[styles.pctBarFill, { width: `${pct}%`, backgroundColor: isYou ? COLORS.primary : COLORS.secondary }]} />
                  </View>
                </View>
                <View style={styles.participantCountCol}>
                  <Text style={styles.participantCount}>{count}</Text>
                  <Text style={styles.participantPct}>{pct}%</Text>
                </View>
              </View>
            );
          })}
        </SectionCard>
      )}

      {/* ── Sentiment Analysis ── */}
      {a.sentiment_analysis && Object.keys(a.sentiment_analysis).length > 0 && (
        <SectionCard icon="mood" title="Sentiment Analysis">
          {Object.entries(a.sentiment_analysis).map(([name, data]) => (
            <View key={name} style={styles.sentimentParticipant}>
              <Text style={styles.subSectionLabel}>{name}</Text>
              {[['positive', COLORS.success], ['neutral', COLORS.textSecondary], ['negative', COLORS.error]].map(([key, fillColor]) => (
                <View key={key} style={styles.barRow}>
                  <Text style={styles.barLabel}>{key}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.min((data[key + '_ratio'] || 0) * 100, 100)}%`, backgroundColor: fillColor }]} />
                  </View>
                  <Text style={styles.barPct}>{Math.round((data[key + '_ratio'] || 0) * 100)}%</Text>
                </View>
              ))}
            </View>
          ))}
        </SectionCard>
      )}

      {/* ── Messaging Patterns ── */}
      {a.messaging_patterns && (
        (a.messaging_patterns.most_active_hours?.length > 0 || a.messaging_patterns.day_of_week_distribution)
      ) && (
        <SectionCard icon="schedule" title="Messaging Patterns">
          {a.messaging_patterns.most_active_hours?.length > 0 && (
            <>
              <Text style={styles.subSectionLabel}>Most Active Hours</Text>
              <View style={styles.peakHoursRow}>
                {a.messaging_patterns.most_active_hours.slice(0, 5).map((h, i) => (
                  <View key={i} style={styles.peakHourChip}>
                    <Text style={styles.peakHourText}>{h.hour}</Text>
                    <Text style={styles.peakHourCount}>{h.count}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          {a.messaging_patterns.day_of_week_distribution && (
            <>
              <Text style={[styles.subSectionLabel, { marginTop: SPACING.md }]}>Day of Week</Text>
              {Object.entries(a.messaging_patterns.day_of_week_distribution)
                .sort((x, y) => y[1] - x[1])
                .map(([day, count]) => (
                  <View key={day} style={styles.barRow}>
                    <Text style={[styles.barLabel, { width: 36 }]}>{day.slice(0, 3)}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${totalMsgs > 0 ? Math.min((count / totalMsgs) * 100, 100) : 0}%`, backgroundColor: COLORS.primary }]} />
                    </View>
                    <Text style={styles.barPct}>{count}</Text>
                  </View>
                ))}
            </>
          )}
        </SectionCard>
      )}

      {/* ── Engagement ── */}
      {a.engagement_metrics && (
        (a.engagement_metrics.response_time_analysis && Object.keys(a.engagement_metrics.response_time_analysis).length > 0) ||
        (a.engagement_metrics.conversation_initiations && Object.keys(a.engagement_metrics.conversation_initiations).length > 0)
      ) && (
        <SectionCard icon="trending-up" title="Engagement">
          {a.engagement_metrics.response_time_analysis && Object.keys(a.engagement_metrics.response_time_analysis).length > 0 && (
            <>
              <Text style={styles.subSectionLabel}>Response Times</Text>
              {Object.entries(a.engagement_metrics.response_time_analysis).map(([name, times]) => (
                <View key={name} style={styles.engagementPersonRow}>
                  <Text style={styles.engagementName}>{name}</Text>
                  <MetricRow label="Avg" value={formatDuration(times.average_minutes)} />
                  <MetricRow label="Fastest" value={formatDuration(times.fastest_minutes)} />
                </View>
              ))}
            </>
          )}
          {a.engagement_metrics.conversation_initiations && Object.keys(a.engagement_metrics.conversation_initiations).length > 0 && (
            <>
              <Text style={[styles.subSectionLabel, { marginTop: SPACING.md }]}>Who Starts Convos</Text>
              {(() => {
                const initiations = a.engagement_metrics.conversation_initiations;
                const total = Object.values(initiations).reduce((s, c) => s + c, 0);
                return Object.entries(initiations).map(([name, count]) => (
                  <View key={name} style={styles.barRow}>
                    <Text style={[styles.barLabel, { width: 80 }]} numberOfLines={1}>{name}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${total > 0 ? (count / total) * 100 : 0}%`, backgroundColor: COLORS.secondary }]} />
                    </View>
                    <Text style={styles.barPct}>{count}x</Text>
                  </View>
                ));
              })()}
            </>
          )}
        </SectionCard>
      )}

      {/* ── Red Flags ── */}
      {(a.red_flags?.red_flags?.length > 0 || a.red_flags?.warnings?.length > 0) ? (
        <SectionCard icon="warning" title="Red Flags & Warnings" titleColor={COLORS.error} accent={COLORS.error}>
          {a.red_flags.red_flags?.map((f, i) => (
            <View key={`rf-${i}`} style={styles.warningRow}>
              <MaterialIcons name="warning" size={14} color={COLORS.error} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.warningType}>{f.type?.replace(/_/g, ' ')} · {f.severity}</Text>
                <Text style={styles.warningText}>{f.description}</Text>
                <Text style={styles.warningSuggestion}>💡 {f.suggestion}</Text>
              </View>
            </View>
          ))}
          {a.red_flags.warnings?.map((w, i) => (
            <View key={`w-${i}`} style={styles.warningRow}>
              <MaterialIcons name="error-outline" size={14} color={COLORS.warning} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.warningType, { color: COLORS.warning }]}>{w.type?.replace(/_/g, ' ')} · {w.severity}</Text>
                <Text style={[styles.warningText, { color: COLORS.textSecondary }]}>{w.description}</Text>
                <Text style={styles.warningSuggestion}>💡 {w.suggestion}</Text>
              </View>
            </View>
          ))}
        </SectionCard>
      ) : healthConf && a.red_flags && (
        <SectionCard icon="check-circle" title="Communication Health" titleColor={COLORS.success}>
          <Text style={styles.noFlagsText}>✅ No significant issues detected in your conversation patterns!</Text>
        </SectionCard>
      )}

      {/* ── Emoji Stats ── */}
      {a.emoji_stats && Object.keys(a.emoji_stats).length > 0 && (
        <SectionCard icon="emoji-emotions" title="Emoji Usage">
          {Object.entries(a.emoji_stats).map(([name, stats]) => (
            <View key={name} style={styles.sentimentParticipant}>
              <Text style={styles.subSectionLabel}>{name}</Text>
              <View style={styles.overviewGrid}>
                <StatBox label="Total" value={stats.total_emojis ?? 0} />
                <StatBox label="Per Msg" value={stats.emojis_per_message ?? 0} />
                <StatBox label="Unique" value={stats.unique_emojis ?? 0} />
              </View>
              {stats.most_used_emojis?.length > 0 && (
                <View style={[styles.emojiRow, { marginTop: SPACING.sm }]}>
                  {stats.most_used_emojis.slice(0, 10).map((e, i) => (
                    <View key={i} style={styles.emojiChip}>
                      <Text style={styles.emojiChar}>{e.emoji}</Text>
                      <Text style={styles.emojiCount}>{e.count}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </SectionCard>
      )}

    </ScrollView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ icon, title, titleColor, accent, children }) {
  return (
    <View style={[styles.card, accent ? { borderLeftWidth: 3, borderLeftColor: accent } : null]}>
      <View style={styles.cardTitleRow}>
        <MaterialIcons name={icon} size={18} color={titleColor || COLORS.text} />
        <Text style={[styles.cardTitleText, titleColor ? { color: titleColor } : null]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function StatBox({ label, value, small }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, small && styles.statValueSm]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MetricRow({ label, value }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  errorText: { ...FONTS.medium, color: COLORS.error, marginTop: SPACING.sm },

  // Health Banner
  healthBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  healthBannerTitle: { ...FONTS.bold, fontSize: FONTS.sizes.lg },
  healthBannerSub: { ...FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  cardTitleText: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: COLORS.text, marginLeft: SPACING.sm },

  // Overview grid
  overviewGrid: { flexDirection: 'row', gap: SPACING.md },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statValue: { ...FONTS.bold, fontSize: FONTS.sizes.xxl, color: COLORS.primary },
  statValueSm: { fontSize: FONTS.sizes.md },
  statLabel: { ...FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  overviewExtra: { marginTop: SPACING.sm },

  // Period
  periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  periodDate: { alignItems: 'center', flex: 1 },
  periodLabel: { ...FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginBottom: 2 },
  periodValue: { ...FONTS.semiBold, fontSize: FONTS.sizes.md, color: COLORS.text },
  periodDurationBadge: {
    marginTop: SPACING.md,
    alignSelf: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  periodDurationText: { ...FONTS.semiBold, fontSize: FONTS.sizes.sm, color: COLORS.primary },

  // Participants
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  participantInfo: { flex: 1, marginRight: SPACING.md },
  participantNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  participantName: { ...FONTS.medium, fontSize: FONTS.sizes.md, color: COLORS.text },
  youBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  youBadgeText: { ...FONTS.semiBold, fontSize: FONTS.sizes.xs, color: COLORS.primary },
  pctBarTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  pctBarFill: { height: 6, borderRadius: 3 },
  participantCountCol: { alignItems: 'flex-end', minWidth: 50 },
  participantCount: { ...FONTS.semiBold, fontSize: FONTS.sizes.md, color: COLORS.text },
  participantPct: { ...FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },

  // Sentiment bars
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  barLabel: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, width: 70, textTransform: 'capitalize' },
  barTrack: { flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden', marginHorizontal: SPACING.sm },
  barFill: { height: 8, borderRadius: 4 },
  barPct: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.text, width: 38, textAlign: 'right' },

  // Metric rows
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  metricLabel: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  metricValue: { ...FONTS.semiBold, fontSize: FONTS.sizes.md, color: COLORS.text },

  // Peak hours
  peakHoursRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  peakHourChip: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  peakHourText: { ...FONTS.semiBold, fontSize: FONTS.sizes.sm, color: COLORS.primary },

  // Sub-section
  subSectionLabel: { ...FONTS.semiBold, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  sentimentParticipant: { marginBottom: SPACING.md, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  engagementPersonRow: { marginBottom: SPACING.sm, paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  engagementName: { ...FONTS.semiBold, fontSize: FONTS.sizes.md, color: COLORS.text, marginBottom: SPACING.xs },

  // Peak hours
  peakHourCount: { ...FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 1 },

  // Warnings
  warningRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, alignItems: 'flex-start' },
  warningType: { ...FONTS.semiBold, fontSize: FONTS.sizes.sm, color: COLORS.error, marginBottom: 2, textTransform: 'capitalize' },
  warningText: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.error, lineHeight: 20 },
  warningSuggestion: { ...FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
  noFlagsText: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.success, textAlign: 'center', paddingVertical: SPACING.sm },

  // Emojis
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  emojiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  emojiChar: { fontSize: 18, marginRight: SPACING.xs },
  emojiCount: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
});
