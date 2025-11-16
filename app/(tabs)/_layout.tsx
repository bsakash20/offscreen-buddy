import { Tabs } from "expo-router";
import { Timer, Settings } from "lucide-react-native";
import React, { useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import Colors from "@/assets/constants/colors";
import { useTimer } from "@/contexts/TimerContext";

export default function TabLayout() {
  const systemColorScheme = useColorScheme();
  const { settings } = useTimer();
  const theme = Colors.dark;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
          height: 84,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600" as const,
          marginTop: 4,
          marginBottom: 4,
        },
        tabBarIconStyle: {
          marginBottom: 4,
        },
        tabBarItemStyle: {
          borderRadius: 12,
          marginHorizontal: 8,
          marginVertical: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Timer",
          tabBarIcon: ({ color, size, focused }) => (
            <Timer
              color={focused ? theme.primary : color}
              size={size}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size, focused }) => (
            <Settings
              color={focused ? theme.primary : color}
              size={size}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
    </Tabs>
  );
}
