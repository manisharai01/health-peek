import { Platform } from 'react-native';

const PROD_API_URL = 'https://health-peek-2.onrender.com';
const DEV_API_URL = Platform.OS === 'android' 
  ? 'http://10.83.170.174:8000'  // Real Android device via ADB (machine's LAN IP)
  : 'http://localhost:8000'; // iOS simulator

const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

export const CONFIG = {
  API_URL,
  APP_VERSION: '1.0.0',
  TOKEN_KEY: 'authToken',
  USER_KEY: 'user',
  MAX_MESSAGE_LENGTH: 5000,
  MAX_BULK_MESSAGES: 100,
  MAX_HISTORY_ITEMS: 100,
  TIME_RANGES: ['7d', '30d', '90d'],
  REPORT_TIME_RANGES: ['7d', '30d', '90d', 'all'],
};
