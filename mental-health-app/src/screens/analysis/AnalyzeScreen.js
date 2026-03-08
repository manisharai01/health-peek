import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { analysisService } from '../../services';
import { useAnalysis } from '../../context/AnalysisContext';
import { AnalysisResultCard } from '../../components/AnalysisComponents';
import { LoadingOverlay, ErrorBanner } from '../../components/CommonComponents';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, GRADIENTS } from '../../theme';

export default function AnalyzeScreen({ navigation }) {
  const { addAnalysis } = useAnalysis();
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      Alert.alert('Empty Message', 'Please enter a message to analyze.');
      return;
    }
    if (trimmed.length > 5000) {
      Alert.alert('Too Long', 'Message must be under 5000 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await analysisService.analyzeMessage(trimmed);
      setResult(data);
      addAnalysis(trimmed, data);

      // Crisis detection
      if (
        data.sentiment?.toLowerCase() === 'negative' &&
        data.confidence > 0.7
      ) {
        Alert.alert(
          'High Risk Detected',
          'This message shows signs of significant distress. If you or someone you know needs help, please reach out to a mental health professional or call a crisis helpline.',
          [{ text: 'I Understand', style: 'cancel' }]
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [message, addAnalysis]);

  const handleClear = () => {
    setMessage('');
    setResult(null);
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Banner */}
        <LinearGradient
          colors={GRADIENTS.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerBanner}
        >
          <View style={styles.headerLogoRow}>
            <View style={styles.headerLogoCircle}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.headerTitle}>Health Peek</Text>
          </View>
          <Text style={styles.headerSubtitle}>Analyze sentiment & emotions from text</Text>
        </LinearGradient>

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {/* Input Section */}
        <View style={styles.inputCard}>
          <Text style={styles.cardTitle}>Analyze a Message</Text>
          <Text style={styles.cardSubtitle}>
            Enter text to analyze its emotional tone and sentiment
          </Text>

          <TextInput
            style={styles.textArea}
            value={message}
            onChangeText={setMessage}
            placeholder="Type or paste a message here..."
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={5000}
          />

          <View style={styles.inputFooter}>
            <Text style={styles.charCount}>
              {message.length}/5000
            </Text>
            <View style={styles.buttonRow}>
              {(message || result) && (
                <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                  <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleAnalyze}
                disabled={!message.trim() || loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={GRADIENTS.primaryButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.analyzeBtn, (!message.trim() || loading) && styles.analyzeBtnDisabled]}
                >
                  <MaterialIcons name="analytics" size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.analyzeBtnText}>
                    {loading ? 'Analyzing...' : 'Analyze'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('ChatImport')}
          >
            <MaterialIcons name="folder-open" size={24} color={COLORS.primary} style={styles.quickIconStyle} />
            <Text style={styles.quickLabel}>Import Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('AnalysisHistory')}
          >
            <MaterialIcons name="history" size={24} color={COLORS.primary} style={styles.quickIconStyle} />
            <Text style={styles.quickLabel}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('ChatHistory')}
          >
            <MaterialIcons name="chat-bubble-outline" size={24} color={COLORS.primary} style={styles.quickIconStyle} />
            <Text style={styles.quickLabel}>Chat History</Text>
          </TouchableOpacity>
        </View>

        {/* Result */}
        {result && <AnalysisResultCard result={result} />}
      </ScrollView>

      <LoadingOverlay visible={loading} message="Analyzing message..." />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  headerBanner: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  headerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLogoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerLogo: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    ...FONTS.bold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    ...FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  inputCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.medium,
  },
  cardTitle: {
    ...FONTS.bold,
    fontSize: FONTS.sizes.xl,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  cardSubtitle: {
    ...FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  textArea: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    minHeight: 130,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    lineHeight: 24,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  charCount: {
    ...FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  clearBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  clearBtnText: {
    ...FONTS.medium,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  analyzeBtn: {
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.glow,
  },
  analyzeBtnDisabled: { opacity: 0.5 },
  analyzeBtnText: {
    ...FONTS.bold,
    fontSize: FONTS.sizes.md,
    color: '#FFFFFF',
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.medium,
    borderTopWidth: 3,
    borderTopColor: COLORS.primary + '30',
  },
  quickIconStyle: { marginBottom: SPACING.sm },
  quickLabel: {
    ...FONTS.semiBold,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
});
