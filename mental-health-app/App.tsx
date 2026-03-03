/**
 * Health Peek - Mental Health Analysis Mobile App
 * @format
 */

import React, { useEffect, useRef } from 'react';
import {
  StatusBar,
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AnalysisProvider } from './src/context/AnalysisContext';
import AuthScreen from './src/screens/auth/AuthScreen';
import AppNavigator from './src/navigation/AppNavigator';

const { width } = Dimensions.get('window');

function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [fadeAnim, scaleAnim, pulseAnim]);

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#0F172A']}
      style={splashStyles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      {/* Decorative orbs */}
      <View style={[splashStyles.orb, splashStyles.orbPurple]} />
      <View style={[splashStyles.orb, splashStyles.orbCyan]} />
      <View style={[splashStyles.orb, splashStyles.orbGreen]} />

      <Animated.View
        style={[
          splashStyles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={splashStyles.logoCircle}>
            <Image
              source={require('./src/assets/logo.png')}
              style={splashStyles.logoImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>
        <Text style={splashStyles.appName}>Health Peek</Text>
        <Text style={splashStyles.tagline}>AI-Powered Mental Wellness</Text>
        <View style={splashStyles.loaderWrap}>
          <ActivityIndicator size="small" color="#8B5CF6" />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.12,
  },
  orbPurple: {
    width: 300,
    height: 300,
    backgroundColor: '#8B5CF6',
    top: -60,
    right: -80,
  },
  orbCyan: {
    width: 200,
    height: 200,
    backgroundColor: '#06B6D4',
    bottom: 60,
    left: -60,
  },
  orbGreen: {
    width: 140,
    height: 140,
    backgroundColor: '#10B981',
    top: '40%',
    left: width * 0.6,
  },
  content: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    marginBottom: 24,
  },
  logoImage: {
    width: 72,
    height: 72,
  },
  appName: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },
  loaderWrap: {
    marginTop: 48,
  },
});

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <AnalysisProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AnalysisProvider>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
