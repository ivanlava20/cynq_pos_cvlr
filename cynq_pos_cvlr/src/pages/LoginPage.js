import React, { useState } from 'react';
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { processLogin } from '../utils/loginProcessing';
import { checkManagerCredentials } from '../utils/checkManagerCredentials';
import { useUser } from '../context/UserContext';
import { store } from '../config/env';

const LoginPage = ({ navigation } = {}) => {
  let setUserSafe = () => {};
  try {
    const userContext = useUser?.();
    if (typeof userContext?.setUser === 'function') {
      setUserSafe = userContext.setUser;
    }
  } catch (error) {
    console.warn('User context is not available in this environment:', error?.message);
  }

  const [employeeSuffix, setEmployeeSuffix] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsManagerAccess, setNeedsManagerAccess] = useState(false);
  const [pendingEmployee, setPendingEmployee] = useState(null);
  const [managerSuffix, setManagerSuffix] = useState('');
  const [portalPassword, setPortalPassword] = useState('');

  const { width, height } = useWindowDimensions();
  const isLandscape = width >= height;

  const handleEmployeeLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const employeeId = `EMP${employeeSuffix.toUpperCase()}`;
      const result = await processLogin(employeeId);

      if (result.status === 'OK' && result.needsManagerAccess === 'N') {
        setUserSafe(result.employeeId, result.name);
        navigation?.navigate?.('Home');
      } else if (result.status === 'OK' && result.needsManagerAccess === 'Y') {
        setPendingEmployee(result);
        setNeedsManagerAccess(true);
        setError('');
      } else {
        setError(result.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManagerVerification = async () => {
    setError('');
    setLoading(true);

    try {
      const managerEmployeeId = `EMP${managerSuffix.toUpperCase()}`;
      const verifyResult = await checkManagerCredentials(managerEmployeeId, portalPassword);

      if (verifyResult.status === 'OK') {
        setUserSafe(pendingEmployee.employeeId, pendingEmployee.name);
        navigation?.navigate?.('Home');
      } else {
        Alert.alert(
          'Access Denied',
          "Trainee don't have sufficient access on the POS. Please contact Cafe Vanleroe Administrator"
        );
        resetManagerFlow();
      }
    } catch (err) {
      Alert.alert(
        'Access Denied',
        "Trainee don't have sufficient access on the POS. Please contact Cafe Vanleroe Administrator"
      );
      resetManagerFlow();
      console.error('Manager verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetManagerFlow = () => {
    setNeedsManagerAccess(false);
    setPendingEmployee(null);
    setManagerSuffix('');
    setPortalPassword('');
    setEmployeeSuffix('');
    setError('');
  };

  if (!isLandscape) {
    return (
      <SafeAreaView style={styles.rotateContainer}>
        <Text style={styles.rotateTitle}>Please rotate your device</Text>
        <Text style={styles.rotateSubtitle}>This login page is optimized for landscape mode.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.landscapeContainer} behavior={undefined}>
        <ImageBackground
          source={require('../../assets/SPLASH.jpg')}
          style={styles.leftPanel}
          resizeMode="cover"
        >
          <View style={styles.leftOverlay}>
            <Text style={styles.leftBrand}>Cafe Vanleroe POS</Text>
            <Text style={styles.leftBranch}>{store.branch}</Text>
            <Text style={styles.leftTagline}>CYNQ DineSphere</Text>
          </View>
        </ImageBackground>

        <View style={styles.rightPanel}>
          <View style={styles.rightGlowTop} />
          <View style={styles.rightGlowBottom} />
          <View style={styles.card}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>

            {needsManagerAccess ? (
              <>
                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>Trainee Access Required</Text>
                  <Text style={styles.infoText}>Employee: {pendingEmployee?.name}</Text>
                  <Text style={styles.infoText}>Enter manager or tenure credentials to grant access.</Text>
                </View>

                <Text style={styles.label}>Manager Employee ID</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.prefix}>EMP</Text>
                  <TextInput
                    placeholder="M0001"
                    value={managerSuffix}
                    onChangeText={(value) => {
                      const next = value.toUpperCase();
                      if (/^[A-Z]?\d{0,4}$/.test(next)) setManagerSuffix(next);
                    }}
                    style={styles.input}
                    autoCapitalize="characters"
                    maxLength={5}
                    editable={!loading}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <Text style={styles.label}>CVLR Portal Password</Text>
                <TextInput
                  placeholder="Enter password"
                  value={portalPassword}
                  onChangeText={setPortalPassword}
                  style={styles.passwordInput}
                  secureTextEntry
                  editable={!loading}
                  placeholderTextColor="#9CA3AF"
                />

                {!!error && <Text style={styles.error}>{error}</Text>}

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.primaryBtn,
                      styles.rowBtn,
                      (loading || !managerSuffix || !portalPassword) && styles.disabledBtn
                    ]}
                    disabled={loading || !managerSuffix || !portalPassword}
                    onPress={handleManagerVerification}
                  >
                    <Text style={styles.primaryBtnText}>{loading ? 'Verifying...' : 'Grant Access'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryBtn, styles.rowBtn, loading && styles.disabledBtn]}
                    disabled={loading}
                    onPress={resetManagerFlow}
                  >
                    <Text style={styles.secondaryBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.label}>Employee ID</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.prefix}>EMP</Text>
                  <TextInput
                    placeholder="A0002"
                    value={employeeSuffix}
                    onChangeText={(value) => {
                      const next = value.toUpperCase();
                      if (/^[A-Z]?\d{0,4}$/.test(next)) setEmployeeSuffix(next);
                    }}
                    style={styles.input}
                    autoCapitalize="characters"
                    maxLength={5}
                    editable={!loading}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {!!error && <Text style={styles.error}>{error}</Text>}

                <TouchableOpacity
                  style={[styles.primaryBtn, (loading || !employeeSuffix) && styles.disabledBtn]}
                  disabled={loading || !employeeSuffix}
                  onPress={handleEmployeeLogin}
                >
                  <Text style={styles.primaryBtnText}>{loading ? 'Logging in...' : 'Login'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  landscapeContainer: {
    flex: 1,
    flexDirection: 'row'
  },
  leftPanel: {
    flex: 1.1
  },
  leftOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 28,
    backgroundColor: 'rgba(15, 23, 42, 0.35)'
  },
  leftBrand: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '800'
  },
  leftBranch: {
    marginTop: 6,
    color: '#fde68a',
    fontSize: 18,
    fontWeight: '700'
  },
  leftTagline: {
    marginTop: 8,
    color: '#e5e7eb',
    fontSize: 14
  },
  rightPanel: {
    flex: 0.9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f59e0b',
    position: 'relative',
    overflow: 'hidden'
  },
  rightGlowTop: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.16)',
    top: -120,
    right: -80
  },
  rightGlowBottom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(120,53,15,0.14)',
    bottom: -90,
    left: -70
  },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827'
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    color: '#92400e',
    marginBottom: 18
  },
  label: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1d7a2',
    borderRadius: 10,
    backgroundColor: '#fff'
  },
  prefix: {
    paddingHorizontal: 12,
    color: '#374151',
    fontWeight: '700',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    color: '#111827'
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#f1d7a2',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#111827'
  },
  error: {
    color: '#dc2626',
    marginTop: 10,
    fontSize: 13
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: '#92400e',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#78350f',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15
  },
  disabledBtn: {
    opacity: 0.6
  },
  infoBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8
  },
  infoTitle: {
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4
  },
  infoText: {
    color: '#0f172a',
    fontSize: 12,
    marginBottom: 2
  },
  buttonRow: {
    marginTop: 12,
    flexDirection: 'row'
  },
  rowBtn: {
    flex: 1
  },
  secondaryBtn: {
    marginTop: 16,
    marginLeft: 10,
    backgroundColor: '#e5e7eb',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center'
  },
  secondaryBtnText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 15
  },
  rotateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#0f172a'
  },
  rotateTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700'
  },
  rotateSubtitle: {
    marginTop: 8,
    color: '#cbd5e1',
    fontSize: 14,
    textAlign: 'center'
  }
});

export default LoginPage;