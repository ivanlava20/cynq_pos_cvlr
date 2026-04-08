import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const normalizeEnvValue = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const hasSingleQuotes = raw.startsWith("'") && raw.endsWith("'");
  const hasDoubleQuotes = raw.startsWith('"') && raw.endsWith('"');
  if (hasSingleQuotes || hasDoubleQuotes) {
    return raw.slice(1, -1).trim();
  }

  return raw;
};

const envValues = {
  EXPO_PUBLIC_FIREBASE_API_KEY: normalizeEnvValue(process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: normalizeEnvValue(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: normalizeEnvValue(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: normalizeEnvValue(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: normalizeEnvValue(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  EXPO_PUBLIC_FIREBASE_APP_ID: normalizeEnvValue(process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
  REACT_APP_FIREBASE_API_KEY: normalizeEnvValue(process.env.REACT_APP_FIREBASE_API_KEY),
  REACT_APP_FIREBASE_AUTH_DOMAIN: normalizeEnvValue(process.env.REACT_APP_FIREBASE_AUTH_DOMAIN),
  REACT_APP_FIREBASE_PROJECT_ID: normalizeEnvValue(process.env.REACT_APP_FIREBASE_PROJECT_ID),
  REACT_APP_FIREBASE_STORAGE_BUCKET: normalizeEnvValue(process.env.REACT_APP_FIREBASE_STORAGE_BUCKET),
  REACT_APP_FIREBASE_MESSAGING_SENDER_ID: normalizeEnvValue(process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID),
  REACT_APP_FIREBASE_APP_ID: normalizeEnvValue(process.env.REACT_APP_FIREBASE_APP_ID)
};

const getEnvValue = (...keys) => {
  for (const key of keys) {
    const value = envValues[key] || '';
    if (value) return value;
  }
  return '';
};

const firebaseConfig = {
  apiKey: getEnvValue('EXPO_PUBLIC_FIREBASE_API_KEY', 'REACT_APP_FIREBASE_API_KEY'),
  authDomain: getEnvValue('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'REACT_APP_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvValue('EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'REACT_APP_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvValue('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'REACT_APP_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvValue('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvValue('EXPO_PUBLIC_FIREBASE_APP_ID', 'REACT_APP_FIREBASE_APP_ID')
};

const requiredFirebaseConfigFields = [
  {
    configKey: 'apiKey',
    envKeys: ['EXPO_PUBLIC_FIREBASE_API_KEY', 'REACT_APP_FIREBASE_API_KEY']
  },
  {
    configKey: 'projectId',
    envKeys: ['EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'REACT_APP_FIREBASE_PROJECT_ID']
  }
];

export const missingFirebaseConfigKeys = requiredFirebaseConfigFields
  .filter(({ configKey }) => !firebaseConfig[configKey])
  .flatMap(({ envKeys }) => envKeys);

const hasRequiredConfig = missingFirebaseConfigKeys.length === 0;
export const isFirebaseConfigComplete = hasRequiredConfig;

if (!hasRequiredConfig) {
  // Keep app booting in dev; Firestore calls will fail with clear errors if config is missing.
  // eslint-disable-next-line no-console
  console.warn('Firebase config is incomplete. Check EXPO_PUBLIC_FIREBASE_* (or REACT_APP_FIREBASE_*) environment variables.');
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
export default app;
