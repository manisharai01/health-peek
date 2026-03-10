import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  Share,
} from 'react-native';
import { blogService } from '../../services';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { EmptyState } from '../../components/CommonComponents';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';

export default function BlogListScreen({ navigation }) {
  const [blogs, setBlogs] = useState([]);
  const [rssArticles, setRssArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('blogs');
  const [likedIds, setLikedIds] = useState(new Set());

  const loadBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const [adminBlogs, builtIn, rss] = await Promise.allSettled([
        blogService.getAdminBlogs(),
        blogService.getAllBlogs(),
        blogService.getRssArticles(),
      ]);

      const admin = adminBlogs.status === 'fulfilled'
        ? (adminBlogs.value?.blogs || adminBlogs.value?.posts || []).map(b => ({ ...b, _isAdminPost: true }))
        : [];
      const built = builtIn.status === 'fulfilled'
        ? (builtIn.value?.blogs || builtIn.value?.posts || [])
        : [];
      const rssData = rss.status === 'fulfilled'
        ? (rss.value?.articles || rss.value?.posts || [])
        : [];

      setBlogs([...admin, ...built]);
      setRssArticles(rssData);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  const handleBlogPress = (blog) => {
    if (blog.link || blog.url) {
      navigation.navigate('BlogDetail', { blogUrl: blog.link || blog.url, title: blog.title });
    } else {
      navigation.navigate('BlogDetail', {
        blogId: blog.id || blog._id,
        isAdminPost: !!blog._isAdminPost,
      });
    }
  };

  const handleLike = async (blogId) => {
    if (likedIds.has(blogId)) return;
    try {
      const res = await blogService.likeBlog(blogId);
      setLikedIds(prev => new Set([...prev, blogId]));
      setBlogs(prev =>
        prev.map(b => (b.id || b._id) === blogId
          ? { ...b, likes: res.likes ?? (b.likes || 0) + 1 }
          : b)
      );
    } catch {
      // Ignore
    }
  };

  const handleShare = async (item) => {
    try {
      await Share.share({
        title: item.title,
        message: `${item.title}\n\n${item.description || item.summary || ''}\n\nShared from Health Peek`,
      });
    } catch {
      // User cancelled
    }
  };

  const renderBlogItem = ({ item }) => {
    const isRss = !!(item.link || item.url);
    const itemId = item.id || item._id;
    const isLiked = likedIds.has(itemId);

    return (
      <TouchableOpacity
        style={styles.blogCard}
        onPress={() => handleBlogPress(item)}
        activeOpacity={0.7}
      >
        {item.cover_image && (
          <Image
            source={{ uri: item.cover_image.startsWith('data:') ? item.cover_image : item.cover_image }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        )}
        {item.image && !item.cover_image && (
          <Image source={{ uri: item.image }} style={styles.coverImage} resizeMode="cover" />
        )}

        <View style={styles.blogContent}>
          <View style={styles.blogHeader}>
            {item.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            )}
            {isRss && (
              <View style={[styles.categoryBadge, { backgroundColor: COLORS.info + '20' }]}>
                <Text style={[styles.categoryText, { color: COLORS.info }]}>RSS</Text>
              </View>
            )}
          </View>

          <Text style={styles.blogTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.blogDesc} numberOfLines={3}>
            {item.description || item.summary || ''}
          </Text>

          <View style={styles.blogFooter}>
            {item.author_email && (
              <Text style={styles.authorText}>By {item.author_email}</Text>
            )}
            <View style={styles.actionRow}>
              {!isRss && itemId && (
                <TouchableOpacity
                  style={[styles.likeBtn, isLiked && styles.likeBtnActive]}
                  onPress={() => handleLike(itemId)}
                >
                  <MaterialIcons
                    name={isLiked ? 'favorite' : 'favorite-border'}
                    size={14}
                    color={isLiked ? '#FFFFFF' : COLORS.error}
                  />
                  <Text style={[styles.likeBtnText, isLiked && { color: '#FFFFFF' }]}>
                    {item.likes || 0}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={() => handleShare(item)}
              >
                <MaterialIcons name="share" size={14} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const currentData = activeTab === 'blogs' ? blogs : rssArticles;

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'blogs' && styles.activeTab]}
          onPress={() => setActiveTab('blogs')}
        >
          <Text style={[styles.tabText, activeTab === 'blogs' && styles.activeTabText]}>
            Articles
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rss' && styles.activeTab]}
          onPress={() => setActiveTab('rss')}
        >
          <Text style={[styles.tabText, activeTab === 'rss' && styles.activeTabText]}>
            RSS Feed
          </Text>
        </TouchableOpacity>
      </View>

      {!loading && currentData.length === 0 ? (
        <EmptyState
          iconName="menu-book"
          title={activeTab === 'blogs' ? 'No Articles Yet' : 'No RSS Articles'}
          message={activeTab === 'blogs' ? 'Check back for mental wellness articles.' : 'RSS feed is currently unavailable.'}
        />
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item, i) => item.id || item._id || item.link || `${i}`}
          renderItem={renderBlogItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadBlogs} colors={[COLORS.primary]} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  activeTab: { backgroundColor: COLORS.primary, ...SHADOWS.glow },
  tabText: { ...FONTS.semiBold, fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  activeTabText: { color: '#FFFFFF' },
  list: { padding: SPACING.lg },
  blogCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  coverImage: { width: '100%', height: 170, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl },
  blogContent: { padding: SPACING.lg },
  blogHeader: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  categoryBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  categoryText: { ...FONTS.semiBold, fontSize: FONTS.sizes.xs, color: COLORS.primary, textTransform: 'capitalize' },
  blogTitle: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: COLORS.text, marginBottom: SPACING.xs },
  blogDesc: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 20 },
  blogFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  authorText: { ...FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textLight, flex: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.error + '12',
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  likeBtnActive: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  likeBtnText: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.error },
  shareBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '25',
  },
  separator: { height: SPACING.md },
});