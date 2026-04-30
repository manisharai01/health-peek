import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../services';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();
  const { colors, gradients, mode, toggleTheme, isDark } = useTheme();
  const styles = makeStyles(colors);

  // Backend stores the display name as `full_name`. Read both for safety.
  const displayName = user?.full_name || user?.name || '';
  const [name, setName] = useState(displayName);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      // Backend expects `full_name` (UserUpdate schema).
      const updated = await authService.updateProfile({ full_name: name.trim() });
      updateUser({
        ...user,
        ...updated,
        full_name: updated?.full_name ?? name.trim(),
        name: updated?.full_name ?? name.trim(),
      });
      setEditing(false);
      Alert.alert('Success', 'Profile updated.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Gradient Avatar Header */}
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            {user?.profile_image ? (
              <Image source={{ uri: user.profile_image }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {(displayName || user?.email || '?')[0].toUpperCase()}
              </Text>
            )}
          </View>
        </View>
        <Text style={styles.userName}>{displayName || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
      </LinearGradient>

      {/* Profile Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile Information</Text>

        <Text style={styles.label}>Name</Text>
        {editing ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textLight}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? '...' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setEditing(false); setName(displayName); }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>{displayName || 'Not set'}</Text>
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>Email</Text>
        <Text style={styles.infoText}>{user?.email || 'N/A'}</Text>

        {user?.is_admin && (
          <>
            <Text style={styles.label}>Role</Text>
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          </>
        )}
      </View>

      {/* Appearance Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Appearance</Text>
        <TouchableOpacity style={styles.themeRow} onPress={toggleTheme} activeOpacity={0.8}>
          <View style={[styles.themeIconWrap, { backgroundColor: colors.primary + '22' }]}>
            <MaterialIcons
              name={isDark ? 'dark-mode' : 'light-mode'}
              size={22}
              color={colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
            <Text style={styles.themeSubtle}>
              Tap to switch to {isDark ? 'light' : 'dark'} theme
            </Text>
          </View>
          <View style={[
            styles.toggleTrack,
            { backgroundColor: isDark ? colors.primary : colors.border },
          ]}>
            <View style={[
              styles.toggleThumb,
              isDark && { transform: [{ translateX: 22 }] },
            ]} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Account Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Export')}>
          <MaterialIcons name="upload-file" size={20} color={colors.primary} style={styles.menuIconStyle} />
          <Text style={styles.menuText}>Export & Reports</Text>
          <MaterialIcons name="chevron-right" size={22} color={colors.textLight} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AnalysisHistory')}>
          <MaterialIcons name="insert-chart-outlined" size={20} color={colors.primary} style={styles.menuIconStyle} />
          <Text style={styles.menuText}>Analysis History</Text>
          <MaterialIcons name="chevron-right" size={22} color={colors.textLight} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => navigation.navigate('ChatHistory')}>
          <MaterialIcons name="chat-bubble-outline" size={20} color={colors.primary} style={styles.menuIconStyle} />
          <Text style={styles.menuText}>Chat Imports</Text>
          <MaterialIcons name="chevron-right" size={22} color={colors.textLight} />
        </TouchableOpacity>
        {user?.is_admin && (
          <TouchableOpacity
            style={[styles.menuItem, styles.adminMenuItem]}
            onPress={() => navigation.navigate('Blogs', { screen: 'AdminBlog' })}
          >
            <MaterialIcons name="create" size={20} color={colors.primary} style={styles.menuIconStyle} />
            <Text style={[styles.menuText, { color: colors.primary }]}>Write Article</Text>
            <MaterialIcons name="chevron-right" size={22} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Health Peek v1.0.0 · {mode} mode</Text>
    </ScrollView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 60 },
  headerGradient: {
    alignItems: 'center',
    paddingTop: SPACING.xxxl,
    paddingBottom: SPACING.xxxl + SPACING.md,
    borderBottomLeftRadius: RADIUS.xxl + SPACING.sm,
    borderBottomRightRadius: RADIUS.xxl + SPACING.sm,
    marginBottom: SPACING.lg,
    ...SHADOWS.glow,
    overflow: 'hidden',
  },
  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarText: { ...FONTS.bold, fontSize: 38, color: '#FFF' },
  userName: { ...FONTS.bold, fontSize: 24, color: '#FFF', letterSpacing: 0.3 },
  userEmail: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.medium,
  },
  cardTitle: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: colors.text, marginBottom: SPACING.lg },
  label: { ...FONTS.semiBold, fontSize: FONTS.sizes.sm, color: colors.textSecondary, marginTop: SPACING.md, marginBottom: SPACING.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoText: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: colors.text },
  editLink: { ...FONTS.semiBold, fontSize: FONTS.sizes.md, color: colors.primary },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    ...FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: colors.text,
    backgroundColor: colors.background,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    ...SHADOWS.small,
  },
  saveBtnText: { ...FONTS.bold, fontSize: FONTS.sizes.sm, color: '#FFF' },
  cancelBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  cancelBtnText: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: colors.textSecondary },
  adminBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '22',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  adminBadgeText: { ...FONTS.semiBold, fontSize: FONTS.sizes.sm, color: colors.primary },

  themeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm },
  themeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  themeSubtle: {
    ...FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  toggleTrack: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF',
    ...SHADOWS.small,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIconStyle: { marginRight: SPACING.md },
  menuText: { ...FONTS.medium, fontSize: FONTS.sizes.md, color: colors.text, flex: 1 },
  adminMenuItem: {
    backgroundColor: colors.primary + '14',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    marginTop: SPACING.sm,
    borderBottomWidth: 0,
  },
  logoutBtn: {
    backgroundColor: colors.error + '12',
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 1.5,
    borderColor: colors.error + '40',
  },
  logoutText: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: colors.error },
  versionText: {
    ...FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: SPACING.xxl,
    marginBottom: SPACING.lg,
    textTransform: 'capitalize',
  },
});
