import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { dashboardService } from '../../services';
import { TimeRangeSelector } from '../../components/CommonComponents';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, GRADIENTS } from '../../theme';

const REPORT_TYPES = [
  {
    key: 'personal',
    title: 'Personal Report',
    icon: 'assignment',
    desc: 'Comprehensive analysis of your mental health trends, patterns, and detailed insights.',
    endpoint: 'personal',
  },
  {
    key: 'clinical',
    title: 'Clinical Summary',
    icon: 'local-hospital',
    desc: 'Professional-grade summary suitable for sharing with healthcare providers.',
    endpoint: 'clinical',
  },
  {
    key: 'charts',
    title: 'Data Charts',
    icon: 'bar-chart',
    desc: 'Visual charts and graphs of your mood trends and sentiment distribution.',
    endpoint: 'charts',
  },
];

const EXPORT_FORMATS = [
  { key: 'csv', label: 'CSV', icon: 'table-chart' },
  { key: 'json', label: 'JSON', icon: 'data-object' },
];

export default function ExportScreen() {
  const [timeRange, setTimeRange] = useState('30d');
  const [downloading, setDownloading] = useState(null);
  const [exporting, setExporting] = useState(null);

  const handleDownloadReport = async (report) => {
    setDownloading(report.key);
    try {
      await dashboardService.downloadReport(report.endpoint, timeRange);
      Alert.alert('Success', `${report.title} downloaded successfully.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to download report.');
    } finally {
      setDownloading(null);
    }
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      await dashboardService.exportData(timeRange, format);
      Alert.alert('Success', `Data exported as ${format.toUpperCase()} successfully.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to export data.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.headingRow}>
        <MaterialIcons name="upload-file" size={26} color={COLORS.text} style={{ marginRight: SPACING.sm }} />
        <Text style={styles.heading}>Export & Reports</Text>
      </View>
      <Text style={styles.subheading}>Download reports or export your data</Text>

      {/* Time Range */}
      <View style={styles.rangeSection}>
        <Text style={styles.sectionTitle}>Time Period</Text>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </View>

      {/* Reports */}
      <Text style={styles.sectionTitle}>Download Reports (PDF)</Text>
      {REPORT_TYPES.map((report) => (
        <View key={report.key} style={styles.card}>
          <View style={styles.cardBody}>
            <MaterialIcons name={report.icon} size={28} color={COLORS.primary} style={styles.cardIconStyle} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{report.title}</Text>
              <Text style={styles.cardDesc}>{report.desc}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleDownloadReport(report)}
            disabled={downloading === report.key}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={GRADIENTS.primaryButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.downloadBtn}
            >
              {downloading === report.key ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.downloadBtnText}>Download PDF</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ))}

      {/* Data Export */}
      <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Export Raw Data</Text>
      <View style={styles.exportRow}>
        {EXPORT_FORMATS.map((fmt) => (
          <TouchableOpacity
            key={fmt.key}
            style={styles.exportCard}
            onPress={() => handleExport(fmt.key)}
            disabled={exporting === fmt.key}
          >
            <MaterialIcons name={fmt.icon} size={36} color={COLORS.primary} style={{ marginBottom: SPACING.sm }} />
            {exporting === fmt.key ? (
              <ActivityIndicator color={COLORS.primary} size="small" style={{ marginTop: 8 }} />
            ) : (
              <>
                <Text style={styles.exportLabel}>{fmt.label}</Text>
                <Text style={styles.exportHint}>Export as {fmt.label}</Text>
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, paddingBottom: 60 },
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  heading: { ...FONTS.bold, fontSize: 24, color: COLORS.text },
  subheading: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  rangeSection: { marginBottom: SPACING.xl },
  sectionTitle: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: COLORS.text, marginBottom: SPACING.md },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  cardBody: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.md },
  cardIconStyle: { marginRight: SPACING.md },
  cardTitle: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: COLORS.text, marginBottom: 4 },
  cardDesc: { ...FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },
  downloadBtn: {
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    ...SHADOWS.glow,
  },
  downloadBtnText: { ...FONTS.bold, fontSize: FONTS.sizes.md, color: '#FFFFFF' },
  exportRow: { flexDirection: 'row', gap: SPACING.md },
  exportCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  exportLabel: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: COLORS.text },
  exportHint: { ...FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 4 },
});
