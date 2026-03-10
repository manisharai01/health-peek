import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { pick, isCancel } from '@react-native-documents/picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { blogService } from '../../services';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';

const CATEGORIES = [
  'Mental Health', 'Mindfulness', 'Anxiety', 'Depression',
  'Relationships', 'Self-Care', 'Wellness', 'Stress', 'Sleep',
];

async function readFileAsBase64(uri) {
  const path = Platform.OS === 'android'
    ? uri.replace('file://', '')
    : uri.replace('file://', '');
  return ReactNativeBlobUtil.fs.readFile(path, 'base64');
}

async function pickImageAsDataUri() {
  const [file] = await pick({ type: ['image/jpeg', 'image/png', 'image/webp', 'image/*'] });
  const base64 = await readFileAsBase64(file.uri);
  const mime = file.type || 'image/jpeg';
  return { uri: file.uri, dataUri: `data:${mime};base64,${base64}`, mime, name: file.name || 'image.jpg' };
}

export default function AdminBlogScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Mental Health');
  const [coverImage, setCoverImage] = useState(null);
  const [sections, setSections] = useState([{ heading: '', body: '', image: null }]);
  const [loading, setLoading] = useState(false);

  const pickCoverImage = useCallback(async () => {
    try {
      const img = await pickImageAsDataUri();
      setCoverImage(img);
    } catch (err) {
      if (!isCancel(err)) Alert.alert('Error', 'Could not pick image');
    }
  }, []);

  const pickSectionImage = useCallback(async (index) => {
    try {
      const img = await pickImageAsDataUri();
      setSections(prev => prev.map((s, i) => i === index ? { ...s, image: img } : s));
    } catch (err) {
      if (!isCancel(err)) Alert.alert('Error', 'Could not pick image');
    }
  }, []);

  const addSection = () => {
    setSections(prev => [...prev, { heading: '', body: '', image: null }]);
  };

  const removeSection = (index) => {
    setSections(prev => prev.filter((_, i) => i !== index));
  };

  const updateSection = (index, field, value) => {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handlePublish = async () => {
    if (!title.trim()) { Alert.alert('Error', 'Title is required'); return; }
    if (!description.trim()) { Alert.alert('Error', 'Summary is required'); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('content', content.trim());
      formData.append('category', category);

      // Sections — embed images as base64 data URIs inside JSON
      const sectionsData = sections
        .filter(s => s.heading.trim() || s.body.trim())
        .map(s => ({
          heading: s.heading.trim(),
          body: s.body.trim(),
          image: s.image?.dataUri || null,
        }));
      formData.append('sections_json', JSON.stringify(sectionsData));

      // Cover image as file upload
      if (coverImage) {
        formData.append('cover_image', {
          uri: coverImage.uri,
          type: coverImage.mime,
          name: coverImage.name,
        });
      }

      await blogService.createAdminBlog(formData);
      Alert.alert('Published!', 'Your article is now live.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to publish article');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

      {/* Cover Image Picker */}
      <TouchableOpacity style={styles.coverPicker} onPress={pickCoverImage} activeOpacity={0.8}>
        {coverImage ? (
          <>
            <Image source={{ uri: coverImage.uri }} style={styles.coverPreview} resizeMode="cover" />
            <View style={styles.coverOverlay}>
              <MaterialIcons name="edit" size={22} color="#FFF" />
              <Text style={styles.coverOverlayText}>Change Cover</Text>
            </View>
          </>
        ) : (
          <View style={styles.coverPlaceholder}>
            <MaterialIcons name="add-photo-alternate" size={44} color={COLORS.textLight} />
            <Text style={styles.coverPlaceholderText}>Tap to add cover image</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Title */}
      <View style={styles.field}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Article title…"
          placeholderTextColor={COLORS.textLight}
        />
      </View>

      {/* Summary */}
      <View style={styles.field}>
        <Text style={styles.label}>Summary *</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Short description shown in article cards…"
          placeholderTextColor={COLORS.textLight}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Category chips */}
      <View style={styles.field}>
        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Main Content */}
      <View style={styles.field}>
        <Text style={styles.label}>Main Content</Text>
        <Text style={styles.hint}>
          Supports **bold**, *italic*, # Heading, ## Subheading, ### Section, - bullet
        </Text>
        <TextInput
          style={[styles.input, styles.contentInput]}
          value={content}
          onChangeText={setContent}
          placeholder="Write your article here…"
          placeholderTextColor={COLORS.textLight}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* Sections */}
      <View style={styles.sectionsHeader}>
        <Text style={styles.label}>Sections</Text>
        <TouchableOpacity style={styles.addBtn} onPress={addSection}>
          <MaterialIcons name="add" size={18} color={COLORS.primary} />
          <Text style={styles.addBtnText}>Add Section</Text>
        </TouchableOpacity>
      </View>

      {sections.map((section, i) => (
        <View key={i} style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <Text style={styles.sectionNum}>Section {i + 1}</Text>
            {sections.length > 1 && (
              <TouchableOpacity onPress={() => removeSection(i)}>
                <MaterialIcons name="delete-outline" size={20} color={COLORS.error} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.fieldLabel}>Heading</Text>
          <TextInput
            style={styles.input}
            value={section.heading}
            onChangeText={v => updateSection(i, 'heading', v)}
            placeholder="Section heading…"
            placeholderTextColor={COLORS.textLight}
          />

          <Text style={[styles.fieldLabel, { marginTop: SPACING.sm }]}>Content</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={section.body}
            onChangeText={v => updateSection(i, 'body', v)}
            placeholder="Section content… (**bold**, *italic*, # heading supported)"
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Section image */}
          <TouchableOpacity
            style={styles.sectionImagePicker}
            onPress={() => pickSectionImage(i)}
            activeOpacity={0.8}
          >
            {section.image ? (
              <>
                <Image source={{ uri: section.image.uri }} style={styles.sectionImagePreview} resizeMode="cover" />
                <View style={styles.sectionImageOverlay}>
                  <MaterialIcons name="edit" size={16} color="#FFF" />
                  <Text style={styles.sectionImageOverlayText}>Change</Text>
                </View>
              </>
            ) : (
              <View style={styles.sectionImagePlaceholder}>
                <MaterialIcons name="image" size={22} color={COLORS.textLight} />
                <Text style={styles.sectionImagePlaceholderText}>Add section image (optional)</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      ))}

      {/* Publish Button */}
      <TouchableOpacity
        style={[styles.publishBtn, loading && styles.publishBtnDisabled]}
        onPress={handlePublish}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <>
            <MaterialIcons name="publish" size={20} color="#FFF" />
            <Text style={styles.publishBtnText}>Publish Article</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 60 },

  coverPicker: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  coverPreview: { width: '100%', height: '100%' },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  coverOverlayText: { ...FONTS.semiBold, fontSize: FONTS.sizes.sm, color: '#FFF' },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  coverPlaceholderText: { ...FONTS.medium, fontSize: FONTS.sizes.md, color: COLORS.textLight },

  field: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  label: { ...FONTS.semiBold, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldLabel: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: 4 },
  hint: { ...FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginBottom: SPACING.sm },

  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    ...FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    ...SHADOWS.small,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  contentInput: { minHeight: 160, textAlignVertical: 'top' },

  chipRow: { flexDirection: 'row', gap: SPACING.sm, paddingBottom: 4 },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  chipText: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary },

  sectionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
  },
  addBtnText: { ...FONTS.semiBold, fontSize: FONTS.sizes.sm, color: COLORS.primary },

  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionNum: { ...FONTS.bold, fontSize: FONTS.sizes.md, color: COLORS.primary },

  sectionImagePicker: {
    marginTop: SPACING.md,
    height: 120,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionImagePreview: { width: '100%', height: '100%' },
  sectionImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  sectionImageOverlayText: { ...FONTS.medium, fontSize: FONTS.sizes.xs, color: '#FFF' },
  sectionImagePlaceholder: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  sectionImagePlaceholderText: { ...FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textLight },

  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    ...SHADOWS.glow,
  },
  publishBtnDisabled: { opacity: 0.6 },
  publishBtnText: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: '#FFF' },
});
