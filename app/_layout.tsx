import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { TimerProvider } from "@/contexts/TimerContext";
import { SupabaseAuthProvider, useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import AuthScreen from "./components/AuthScreen";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import Colors from "@/assets/constants/colors";
import ErrorBoundary from "./components/ErrorBoundary";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Main app content (shown when authenticated)
function MainApp() {
  const {
    user,
    isLoading,
    login,
    signup,
    logout
  } = useSupabaseAuth();

  const [initializing, setInitializing] = useState(true);

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

  useEffect(() => {
    // Hide splash screen after initial load
    const timer = setTimeout(() => {
      setInitializing(false);
      SplashScreen.hideAsync();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading || initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  // Show main app if authenticated
  if (user) {
    return (
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    );
  }

  // Show authentication screen
  return (
    <AuthScreen
      onLogin={handleLogin}
      onSignup={handleSignup}
      isLoading={isLoading}
    />
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.dark.background }}>
        <SupabaseAuthProvider>
          <TimerProvider>
            <ErrorBoundary>
              <MainApp />
            </ErrorBoundary>
          </TimerProvider>
        </SupabaseAuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
