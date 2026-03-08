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
import { authService } from '../../services';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, GRADIENTS } from '../../theme';

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const updated = await authService.updateProfile({ name: name.trim() });
      updateUser(updated);
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
        colors={GRADIENTS.primary}
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
                {(user?.name || user?.email || '?')[0].toUpperCase()}
              </Text>
            )}
          </View>
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
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
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? '...' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(false); setName(user?.name || ''); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>{user?.name || 'Not set'}</Text>
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

      {/* Account Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Export')}>
          <MaterialIcons name="upload-file" size={20} color={COLORS.primary} style={styles.menuIconStyle} />
          <Text style={styles.menuText}>Export & Reports</Text>
          <MaterialIcons name="chevron-right" size={22} color={COLORS.textLight} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AnalysisHistory')}>
          <MaterialIcons name="insert-chart-outlined" size={20} color={COLORS.primary} style={styles.menuIconStyle} />
          <Text style={styles.menuText}>Analysis History</Text>
          <MaterialIcons name="chevron-right" size={22} color={COLORS.textLight} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ChatHistory')}>
          <MaterialIcons name="chat-bubble-outline" size={20} color={COLORS.primary} style={styles.menuIconStyle} />
          <Text style={styles.menuText}>Chat Imports</Text>
          <MaterialIcons name="chevron-right" size={22} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Health Peek v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  userEmail: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
  },
  cardTitle: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: COLORS.text, marginBottom: SPACING.lg },
  label: { ...FONTS.semiBold, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.md, marginBottom: SPACING.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoText: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.text },
  editLink: { ...FONTS.semiBold, fontSize: FONTS.sizes.md, color: COLORS.primary },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    ...FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    ...SHADOWS.small,
  },
  saveBtnText: { ...FONTS.bold, fontSize: FONTS.sizes.sm, color: '#FFF' },
  cancelBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  cancelBtnText: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  adminBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  adminBadgeText: { ...FONTS.semiBold, fontSize: FONTS.sizes.sm, color: COLORS.primary },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  menuIconStyle: { marginRight: SPACING.md },
  menuText: { ...FONTS.medium, fontSize: FONTS.sizes.md, color: COLORS.text, flex: 1 },
  logoutBtn: {
    backgroundColor: COLORS.error + '08',
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.error + '20',
  },
  logoutText: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: COLORS.error },
  versionText: {
    ...FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.xxl,
    marginBottom: SPACING.lg,
  },
});
