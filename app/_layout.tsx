import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme } from "./_design-system/providers/ThemeProvider";
import { SupabaseAuthProvider, useSupabaseAuth } from './_contexts/SupabaseAuthContext';

import { TimerProvider } from './_contexts/TimerContext';
import AuthScreen from "./_components/AuthScreen";
import OnboardingScreen from './_components/OnboardingScreen';
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import Colors from "@/assets/constants/colors";
import ErrorBoundary from "./_components/ErrorBoundary";
import AsyncStorage from '@react-native-async-storage/async-storage';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Main app content (shown when authenticated)
function MainApp() {
  const {
    user,
    isLoading,
    signInWithGoogle,
    login,
    signup,
    logout,
    isAuthenticated,
    isLoading: isAuthLoading
  } = useSupabaseAuth();

  const { colors } = useTheme().theme;

  const router = useRouter();

  const [initializing, setInitializing] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('has_launched').then(value => {
      if (value === null) {
        setIsFirstLaunch(true);
      } else {
        setIsFirstLaunch(false);
      }
    });
  }, []);

  const handleOnboardingComplete = async () => {
    setIsFirstLaunch(false);
    await AsyncStorage.setItem('has_launched', 'true');
  };

  // Wrapper functions to match AuthScreen interface
  const handleLogin = async (credentials: any) => {
    try {
      await login(credentials.email, credentials.password);
    } catch (error) {
      console.error('[MainApp] Login error:', error);
      throw error;
    }
  };

  const handleSignup = async (credentials: any) => {
    try {
      await signup(credentials.email, credentials.password, credentials.name);
    } catch (error) {
      console.error('[MainApp] Signup error:', error);
      throw error;
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('[MainApp] Google Login error:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Hide splash screen after initial load
    const timer = setTimeout(() => {
      setInitializing(false);
      SplashScreen.hideAsync();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isAuthLoading || isFirstLaunch === null) {
    // Improve loading screen to match theme
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.system.background.primary }}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={colors.brand.primary[500]} />
      </View>
    );
  }

  if (isFirstLaunch) {
    return (
      <OnboardingScreen onComplete={handleOnboardingComplete} />
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.system.background.primary }}>
        <StatusBar style="light" />
        <AuthScreen
          onLogin={handleLogin}
          onSignup={handleSignup}
          onGoogleLogin={handleGoogleLogin}
          isLoading={isLoading}
        />
      </View>
    );
  }

  // Show main app if authenticated
  if (user) {
    return (
      <Stack screenOptions={{ headerBackTitle: "Back", contentStyle: { backgroundColor: Colors.dark.background } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    );
  }

  // Show authentication screen
  return (
    <View style={{ flex: 1, backgroundColor: Colors.dark.background }}>
      <AuthScreen
        onLogin={handleLogin}
        onSignup={handleSignup}
        onGoogleLogin={handleGoogleLogin}
        isLoading={isLoading}
      />
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SupabaseAuthProvider>
            <TimerProvider>
              <ErrorBoundary>
                <MainApp />
              </ErrorBoundary>
            </TimerProvider>
          </SupabaseAuthProvider>
        </GestureHandlerRootView>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
