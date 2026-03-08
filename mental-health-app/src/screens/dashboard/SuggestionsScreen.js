import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Linking,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { dashboardService, blogService } from '../../services';
import { EmptyState } from '../../components/CommonComponents';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';

export default function SuggestionsScreen({ navigation }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getSuggestions();
      setSuggestions(data?.suggestions || []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const handleLearnMore = (suggestion) => {
    if (suggestion.blog_id) {
      navigation.navigate('BlogDetail', { blogId: suggestion.blog_id });
    } else if (suggestion.external_url) {
      Linking.openURL(suggestion.external_url);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: COLORS.priorityLow,
      medium: COLORS.priorityMedium,
      high: COLORS.priorityHigh,
      critical: COLORS.priorityCritical,
    };
    return colors[priority?.toLowerCase()] || COLORS.textSecondary;
  };

  const CATEGORY_ICONS = {
    mindfulness: 'self-improvement',
    exercise: 'directions-run',
    sleep: 'bedtime',
    social: 'people',
    professional: 'local-hospital',
    nutrition: 'restaurant',
    creativity: 'palette',
    relaxation: 'spa',
  };

  const getCategoryIcon = (category) =>
    CATEGORY_ICONS[category?.toLowerCase()] || 'lightbulb';

  const renderItem = ({ item }) => {
    const hasLink = item.blog_id || item.external_url;
    const prioColor = getPriorityColor(item.priority);

    return (
      <View style={[styles.card, { borderLeftColor: prioColor }]}>
        <View style={styles.cardHeader}>
          <MaterialIcons name={getCategoryIcon(item.category)} size={28} color={COLORS.primary} style={styles.categoryIcon} />
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: prioColor + '20' }]}>
              <Text style={[styles.priorityText, { color: prioColor }]}>
                {item.priority === 'critical' && (
                  <MaterialIcons name="warning" size={12} color={getPriorityColor('critical')} />
                )}{item.priority === 'critical' ? ' ' : ''}{item.priority}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.cardDesc}>{item.description}</Text>
        {hasLink && (
          <TouchableOpacity
            style={styles.learnMoreBtn}
            onPress={() => handleLearnMore(item)}
          >
            <Text style={styles.learnMoreText}>
              {item.blog_id ? 'Read Article →' : 'Learn More →'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (!loading && suggestions.length === 0) {
    return (
      <EmptyState
        iconName="lightbulb"
        title="Start Your Journey"
        message="Analyze some messages to receive personalized recommendations based on your emotional patterns."
      />
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={suggestions}
      keyExtractor={(item, index) => `${item.title}-${index}`}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadSuggestions} colors={[COLORS.primary]} />
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.lg },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderLeftWidth: 4,
    ...SHADOWS.medium,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  categoryIcon: { fontSize: 28, marginRight: SPACING.md },
  cardTitleContainer: { flex: 1 },
  cardTitle: { ...FONTS.semiBold, fontSize: FONTS.sizes.lg, color: COLORS.text, marginBottom: SPACING.xs },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  priorityText: { ...FONTS.semiBold, fontSize: FONTS.sizes.xs, textTransform: 'capitalize' },
  cardDesc: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 22, marginBottom: SPACING.md },
  learnMoreBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary + '15',
    borderRadius: RADIUS.md,
  },
  learnMoreText: { ...FONTS.semiBold, fontSize: FONTS.sizes.md, color: COLORS.primary },
  separator: { height: SPACING.md },
});
