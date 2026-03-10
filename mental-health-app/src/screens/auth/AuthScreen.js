import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, GRADIENTS } from '../../theme';

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (!isLogin && !name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, name.trim());
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.message || (isLogin ? 'Login failed' : 'Registration failed')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.darkBg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Dark Branding Panel */}
          <LinearGradient
            colors={[COLORS.darkBg, '#1a1f3a', COLORS.darkCard]}
            style={styles.brandingPanel}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Decorative orbs */}
            <View style={[styles.orb, styles.orbPurple]} />
            <View style={[styles.orb, styles.orbCyan]} />
            <View style={[styles.orb, styles.orbGreen]} />

            <View style={styles.logoContainer}>
              <View style={styles.logoGlow} />
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>Health Peek</Text>
            <Text style={styles.tagline}>
              AI-Powered Mental Health{"\n"}Chat Analyzer
            </Text>

            {/* Feature highlights */}
            <Animated.View style={[styles.features, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.featureRow}>
                <LinearGradient
                  colors={['#8B5CF6', '#A78BFA']}
                  style={styles.featureDot}
                />
                <Text style={styles.featureText}>Sentiment & Emotion Analysis</Text>
              </View>
              <View style={styles.featureRow}>
                <LinearGradient
                  colors={['#06B6D4', '#22D3EE']}
                  style={styles.featureDot}
                />
                <Text style={styles.featureText}>Mental Wellbeing Tracking</Text>
              </View>
              <View style={styles.featureRow}>
                <LinearGradient
                  colors={['#10B981', '#34D399']}
                  style={styles.featureDot}
                />
                <Text style={styles.featureText}>Personalized Recommendations</Text>
              </View>
            </Animated.View>
          </LinearGradient>

          {/* White Form Panel */}
          <View style={styles.formPanel}>
            <Text style={styles.welcomeTitle}>
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </Text>
            <Text style={styles.welcomeSubtitle}>
              {isLogin
                ? 'Sign in to continue your wellness journey'
                : 'Start your mental wellness journey today'}
            </Text>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, isLogin && styles.activeTab]}
                onPress={() => setIsLogin(true)}
              >
                <Text style={[styles.tabText, isLogin && styles.activeTabText]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, !isLogin && styles.activeTab]}
                onPress={() => setIsLogin(false)}
              >
                <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Name Field (Register Only) */}
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="person-outline" size={18} color={COLORS.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor={COLORS.textLight}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="email" size={18} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock-outline" size={18} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min 6 characters"
                  placeholderTextColor={COLORS.textLight}
                  secureTextEntry
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
              style={{ marginTop: SPACING.sm }}
            >
              <LinearGradient
                colors={GRADIENTS.primaryButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButton}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Switch Prompt */}
            <TouchableOpacity
              style={styles.switchPrompt}
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={styles.switchText}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.switchLink}>
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.privacyRow}>
              <MaterialIcons name="security" size={14} color={COLORS.textLight} style={{ marginRight: 6 }} />
              <Text style={styles.privacyNote}>
                Your data is processed locally and securely
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'android' ? 24 : 0,
  },
  brandingPanel: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 40,
    paddingHorizontal: SPACING.xxl,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.15,
  },
  orbPurple: {
    width: 200,
    height: 200,
    backgroundColor: COLORS.primary,
    top: -40,
    right: -60,
  },
  orbCyan: {
    width: 150,
    height: 150,
    backgroundColor: COLORS.secondary,
    bottom: 20,
    left: -40,
  },
  orbGreen: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.accent,
    top: 60,
    left: 30,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  logo: {
    width: 56,
    height: 56,
  },
  appName: {
    fontSize: 32,
    ...FONTS.bold,
    color: '#FFFFFF',
    marginBottom: SPACING.xs,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: FONTS.sizes.md,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xxl,
    letterSpacing: 0.3,
  },
  features: {
    alignSelf: 'stretch',
    gap: SPACING.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  featureDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  featureText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FONTS.sizes.sm,
    ...FONTS.medium,
    letterSpacing: 0.2,
  },
  formPanel: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
    marginTop: -SPACING.md,
  },
  welcomeTitle: {
    fontSize: FONTS.sizes.xxl,
    ...FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  welcomeSubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.glow,
  },
  tabText: {
    ...FONTS.semiBold,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.textOnPrimary,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...FONTS.medium,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  inputIcon: {
    marginLeft: SPACING.lg,
  },
  input: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.lg : SPACING.md,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
  },
  submitButton: {
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.glow,
  },
  submitButtonText: {
    ...FONTS.bold,
    fontSize: FONTS.sizes.lg,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  switchPrompt: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  switchText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  switchLink: {
    color: COLORS.primary,
    ...FONTS.bold,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  privacyNote: {
    color: COLORS.textLight,
    fontSize: FONTS.sizes.sm,
  },
});
