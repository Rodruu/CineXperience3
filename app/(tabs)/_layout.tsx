import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const RED = "#e50914";
const INACTIVE = "rgba(255,255,255,0.28)";

function TabIcon({
  name,
  focused,
  color,
  label,
}: {
  name: string;
  focused: boolean;
  color: string;
  label: string;
}) {
  return (
    <View style={tabStyles.wrap}>
      {focused && <View style={tabStyles.indicator} />}
      <Feather name={name as any} size={focused ? 22 : 20} color={color} />
      <Text style={[tabStyles.label, { color }]}>{label}</Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 6,
    width: 52,
    gap: 3,
  },
  indicator: {
    position: "absolute",
    top: -1,
    width: 20,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: RED,
  },
  label: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
});

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === "android";
  const tabBarHeight = isAndroid ? 64 : 68;
  const bottomPad = isAndroid ? Math.max(insets.bottom, 6) : Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: RED,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isAndroid ? "rgba(5,5,5,0.97)" : "transparent",
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.07)",
          elevation: isAndroid ? 20 : 0,
          height: tabBarHeight + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 2,
        },
        tabBarBackground: () =>
          !isAndroid ? (
            <BlurView
              intensity={90}
              tint="dark"
              style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(3,3,3,0.6)" }]}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "rgba(5,5,5,0.97)", borderTopWidth: 1, borderTopColor: "rgba(229,9,20,0.12)" },
              ]}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" focused={focused} color={color} label="Inicio" />
          ),
        }}
      />
      <Tabs.Screen
        name="movies"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="film" focused={focused} color={color} label="Películas" />
          ),
        }}
      />
      <Tabs.Screen
        name="series"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="tv" focused={focused} color={color} label="Series" />
          ),
        }}
      />
      <Tabs.Screen
        name="recent"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="clock" focused={focused} color={color} label="Recientes" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="user" focused={focused} color={color} label="Perfil" />
          ),
        }}
      />
    </Tabs>
  );
}
