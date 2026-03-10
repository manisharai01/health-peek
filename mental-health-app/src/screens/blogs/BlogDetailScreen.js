import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Linking,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Share,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { blogService } from '../../services';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';

// ─── Rich text: parse **bold**, *italic*, # H1, ## H2, ### H3, - bullet ───────
function parseInline(text) {
  const tokens = [];
  const regex = /(\*\*[^*]+?\*\*|\*[^*]+?\*)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: text.slice(lastIndex, match.index), bold: false, italic: false });
    }
    if (match[0].startsWith('**')) {
      tokens.push({ text: match[0].slice(2, -2), bold: true, italic: false });
    } else {
      tokens.push({ text: match[0].slice(1, -1), bold: false, italic: true });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({ text: text.slice(lastIndex), bold: false, italic: false });
  }
  return tokens;
}

function InlineLine({ text, baseStyle }) {
  const tokens = parseInline(text);
  return (
    <Text style={baseStyle}>
      {tokens.map((tok, i) => (
        <Text
          key={i}
          style={[
            tok.bold && styles.boldText,
            tok.italic && styles.italicText,
          ]}
        >
          {tok.text}
        </Text>
      ))}
    </Text>
  );
}

function RichText({ text, baseStyle }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <View>
      {lines.map((line, i) => {
        if (line.startsWith('### ')) {
          return <Text key={i} style={styles.h3}>{line.slice(4)}</Text>;
        }
        if (line.startsWith('## ')) {
          return <Text key={i} style={styles.h2}>{line.slice(3)}</Text>;
        }
        if (line.startsWith('# ')) {
          return <Text key={i} style={styles.h1}>{line.slice(2)}</Text>;
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <InlineLine text={line.slice(2)} baseStyle={[styles.body, styles.bulletLineText, baseStyle]} />
            </View>
          );
        }
        if (line.trim() === '') {
          return <View key={i} style={{ height: SPACING.sm }} />;
        }
        return <InlineLine key={i} text={line} baseStyle={[styles.body, baseStyle]} />;
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function BlogDetailScreen({ route }) {
  const { blogId, blogUrl, title, isAdminPost } = route.params || {};
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    if (blogUrl) {
      setBlog({ title: title || 'Article', link: blogUrl });
      setLoading(false);
      return;
    }

    const fetchBlog = async () => {
      try {
        let data;
        if (isAdminPost) {
          const res = await blogService.getAdminBlog(blogId);
          data = res.blog || res;
        } else {
          const res = await blogService.getBlog(blogId);
          data = res.blog || res;
        }
        setBlog(data);
        setLikeCount(data?.likes || 0);
      } catch {
        setBlog(null);
      } finally {
        setLoading(false);
      }
    };
    if (blogId) fetchBlog();
    else setLoading(false);
  }, [blogId, blogUrl, title, isAdminPost]);

  const handleLike = async () => {
    if (liked || !isAdminPost || !blogId) return;
    try {
      const res = await blogService.likeBlog(blogId);
      setLiked(true);
      setLikeCount(res.likes ?? likeCount + 1);
    } catch { /* ignore */ }
  };

  const handleShare = async () => {
    if (!blog) return;
    try {
      await Share.share({
        title: blog.title,
        message: `${blog.title}\n\n${blog.description || blog.summary || ''}\n\nShared from Health Peek`,
      });
    } catch { /* user cancelled */ }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!blog) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Article not found.</Text>
      </View>
    );
  }

  // RSS article — show title and open in browser
  if (blog.link && !blog.content && !blog.sections) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>{blog.title}</Text>
          <View style={styles.actionBar}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
              <MaterialIcons name="share" size={18} color={COLORS.primary} />
              <Text style={styles.actionBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.openBtn}
            onPress={() => Linking.openURL(blog.link)}
          >
            <MaterialIcons name="language" size={18} color="#FFFFFF" />
            <Text style={styles.openBtnText}>Open in Browser</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Full blog post
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Cover Image */}
        {blog.cover_image && (
          <Image
            source={{ uri: blog.cover_image }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        )}
        {blog.image && !blog.cover_image && (
          <Image source={{ uri: blog.image }} style={styles.coverImage} resizeMode="cover" />
        )}

        {/* Category & Tags */}
        <View style={styles.metaRow}>
          {blog.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{blog.category}</Text>
            </View>
          )}
          {(blog.tags || []).map((tag, i) => (
            <View key={i} style={styles.tagBadge}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>

        {/* Title */}
        <Text style={styles.title}>{blog.title}</Text>

        {/* Author & Date Row */}
        <View style={styles.authorRow}>
          <View style={{ flex: 1 }}>
            {(blog.author_email || blog.author) && (
              <Text style={styles.authorText}>By {blog.author_email || blog.author}</Text>
            )}
            {(blog.created_at || blog.date) && (
              <Text style={styles.dateText}>
                {new Date(blog.created_at || blog.date).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </Text>
            )}
          </View>
          {/* Share & Like */}
          <View style={styles.actionBar}>
            {isAdminPost && (
              <TouchableOpacity
                style={[styles.likeBtn, liked && styles.likeBtnActive]}
                onPress={handleLike}
              >
                <MaterialIcons
                  name={liked ? 'favorite' : 'favorite-border'}
                  size={16}
                  color={liked ? '#FFFFFF' : COLORS.error}
                />
                <Text style={[styles.likeBtnCount, liked && { color: '#FFFFFF' }]}>
                  {likeCount}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <MaterialIcons name="share" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Description / Subtitle */}
        {(blog.description || blog.summary) && (
          <Text style={styles.description}>{blog.description || blog.summary}</Text>
        )}

        {/* Main Content with Rich Text */}
        {blog.content && (
          <View style={styles.contentBlock}>
            <RichText text={blog.content} />
          </View>
        )}

        {/* Sections */}
        {(blog.sections || []).map((section, idx) => (
          <View key={idx} style={styles.sectionCard}>
            {section.heading && (
              <Text style={styles.sectionHeading}>{section.heading}</Text>
            )}
            {(section.image || section.sectionImage) && (
              <Image
                source={{ uri: section.image || section.sectionImage }}
                style={styles.sectionImage}
                resizeMode="cover"
              />
            )}
            {(section.body || section.sectionDescription) && (
              <RichText text={section.body || section.sectionDescription} />
            )}
            {(section.tips || []).length > 0 && (
              <View style={styles.tipsContainer}>
                {section.tips.map((tip, ti) => (
                  <View key={ti} style={styles.tipRow}>
                    <MaterialIcons name="lightbulb" size={16} color={COLORS.primary} style={{ marginRight: SPACING.sm }} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Footer likes bar (non-admin / decorative) */}
        {!isAdminPost && (blog.likes !== undefined) && (
          <View style={styles.footer}>
            <MaterialIcons name="favorite" size={16} color={COLORS.secondary} />
            <Text style={styles.footerLikes}>{blog.likes || 0} likes</Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  errorText: { ...FONTS.medium, fontSize: FONTS.sizes.lg, color: COLORS.textSecondary },

  coverImage: { width: '100%', height: 220, marginBottom: SPACING.lg },
  sectionImage: {
    width: '100%',
    height: 180,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    marginTop: SPACING.xs,
  },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm, paddingHorizontal: SPACING.lg },
  categoryBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  categoryText: { ...FONTS.semiBold, fontSize: FONTS.sizes.xs, color: COLORS.primary, textTransform: 'capitalize' },
  tagBadge: {
    backgroundColor: COLORS.divider,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  tagText: { ...FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },

  title: { ...FONTS.bold, fontSize: 24, color: COLORS.text, marginBottom: SPACING.md, paddingHorizontal: SPACING.lg, lineHeight: 32 },

  authorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  authorText: { ...FONTS.medium, fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  dateText: { ...FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textLight, marginTop: 2 },

  actionBar: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginLeft: SPACING.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '10',
  },
  actionBtnText: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.primary },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.error + '12',
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  likeBtnActive: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  likeBtnCount: { ...FONTS.semiBold, fontSize: FONTS.sizes.sm, color: COLORS.error },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '25',
  },

  description: {
    ...FONTS.medium,
    fontSize: FONTS.sizes.lg,
    color: COLORS.textSecondary,
    lineHeight: 26,
    marginBottom: SPACING.lg,
    fontStyle: 'italic',
    paddingHorizontal: SPACING.lg,
  },

  contentBlock: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },

  // RichText styles
  h1: { ...FONTS.bold, fontSize: 22, color: COLORS.text, marginTop: SPACING.lg, marginBottom: SPACING.sm, lineHeight: 30 },
  h2: { ...FONTS.bold, fontSize: 19, color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.xs, lineHeight: 26 },
  h3: { ...FONTS.semiBold, fontSize: 16, color: COLORS.primary, marginTop: SPACING.md, marginBottom: SPACING.xs, lineHeight: 22 },
  body: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.text, lineHeight: 24, marginBottom: SPACING.xs },
  boldText: { fontWeight: 'bold' },
  italicText: { fontStyle: 'italic' },
  bulletRow: { flexDirection: 'row', marginBottom: SPACING.xs },
  bulletDot: { ...FONTS.bold, fontSize: FONTS.sizes.md, color: COLORS.primary, marginRight: SPACING.sm, lineHeight: 24 },
  bulletLineText: { flex: 1 },

  // Sections
  sectionCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary + '40',
    paddingLeft: SPACING.md,
  },
  sectionHeading: {
    ...FONTS.bold,
    fontSize: FONTS.sizes.xl,
    color: COLORS.text,
    marginBottom: SPACING.md,
    lineHeight: 28,
  },

  tipsContainer: {
    backgroundColor: COLORS.primary + '08',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  tipRow: { flexDirection: 'row', marginBottom: SPACING.sm },
  tipText: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.text, flex: 1, lineHeight: 22 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    justifyContent: 'center',
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    marginHorizontal: SPACING.lg,
  },
  footerLikes: { ...FONTS.semiBold, fontSize: FONTS.sizes.md, color: COLORS.secondary },

  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    alignSelf: 'center',
    marginTop: SPACING.xl,
    ...SHADOWS.glow,
  },
  openBtnText: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: '#FFFFFF' },
});
