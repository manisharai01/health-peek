import api from './api';
import { CONFIG } from '../config';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Pick a writable directory for downloaded/exported files.
// CacheDir works without storage permissions on all Android versions and is
// shareable via react-native-share's bundled FileProvider.
const targetDir = () => {
  const dirs = ReactNativeBlobUtil.fs.dirs;
  return Platform.OS === 'android' ? dirs.CacheDir : dirs.DocumentDir;
};

const sanitize = (name) => String(name || 'file').replace(/[^a-z0-9_\-.]/gi, '_');

const flattenForCsv = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  const keys = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row || {}).forEach((k) => set.add(k));
      return set;
    }, new Set())
  );
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    let s = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = keys.join(',');
  const body = rows.map((row) => keys.map((k) => escape(row?.[k])).join(',')).join('\n');
  return `${header}\n${body}`;
};

const shareFile = async ({ filePath, mimeType, title, fileName }) => {
  try {
    await Share.open({
      url: Platform.OS === 'android' ? `file://${filePath}` : filePath,
      type: mimeType,
      title,
      filename: fileName,
      failOnCancel: false,
    });
  } catch (err) {
    const msg = err?.message || String(err);
    if (/cancel|dismiss|user did not share/i.test(msg)) return;
    throw new Error(`Could not open share sheet: ${msg}`);
  }
};

const dashboardService = {
  async getDashboardStats(timeRange = '30d') {
    return api.get('/dashboard/stats', { time_range: timeRange });
  },

  async getMoodTrends(timeRange = '30d') {
    return api.get('/dashboard/mood-trends', { time_range: timeRange });
  },

  async getSuggestions() {
    return api.get('/dashboard/suggestions');
  },

  async exportData(timeRange = '30d', format = 'json') {
    // Backend always returns JSON; for CSV the response is a JSON envelope
    // with pre-flattened rows under `data`. We persist the file locally and
    // open the share sheet so the user can save/send it.
    const payload = await api.get('/dashboard/export', { time_range: timeRange, format });

    let contents;
    let mimeType;
    let ext;
    if (format === 'csv') {
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      if (rows.length === 0) {
        throw new Error('No analysis data available to export.');
      }
      contents = flattenForCsv(rows);
      mimeType = 'text/csv';
      ext = 'csv';
    } else {
      contents = JSON.stringify(payload, null, 2);
      mimeType = 'application/json';
      ext = 'json';
    }

    const fileName = sanitize(`mental_health_export_${timeRange}.${ext}`);
    const filePath = `${targetDir()}/${fileName}`;

    try {
      await ReactNativeBlobUtil.fs.writeFile(filePath, contents, 'utf8');
    } catch (err) {
      throw new Error(`Failed to save export file: ${err?.message || err}`);
    }

    await shareFile({ filePath, mimeType, title: `Export ${ext.toUpperCase()}`, fileName });
    return filePath;
  },

  async downloadReport(type, timeRange = '30d') {
    const endpoints = {
      personal: '/dashboard/reports/personal',
      clinical: '/dashboard/reports/clinical',
      charts: '/dashboard/reports/charts',
    };

    const endpoint = endpoints[type];
    if (!endpoint) throw new Error('Invalid report type');

    const token = await AsyncStorage.getItem(CONFIG.TOKEN_KEY);
    if (!token) throw new Error('Not authenticated. Please sign in again.');

    const url = `${CONFIG.API_URL}${endpoint}?time_range=${encodeURIComponent(timeRange)}`;
    const fileName = sanitize(`${type}_report_${timeRange}.pdf`);
    const filePath = `${targetDir()}/${fileName}`;

    let res;
    try {
      res = await ReactNativeBlobUtil.config({
        fileCache: true,
        path: filePath,
      }).fetch('GET', url, {
        Authorization: `Bearer ${token}`,
        Accept: 'application/pdf',
      });
    } catch (err) {
      throw new Error(`Network error while downloading report: ${err?.message || err}`);
    }

    const status = res.info()?.status ?? 0;
    if (status < 200 || status >= 300) {
      // Body contains FastAPI's JSON error — surface its message.
      let detail = `HTTP ${status}`;
      try {
        const text = await res.text();
        const parsed = JSON.parse(text);
        detail = parsed?.detail || parsed?.message || text || detail;
      } catch {
        // keep generic status detail
      }
      try { await res.flush(); } catch { /* noop */ }
      throw new Error(detail);
    }

    const savedPath = res.path();
    await shareFile({
      filePath: savedPath,
      mimeType: 'application/pdf',
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
      fileName,
    });
    return savedPath;
  },
};

export default dashboardService;
