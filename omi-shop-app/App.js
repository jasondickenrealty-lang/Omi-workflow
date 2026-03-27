import React from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import GalleryScreen from "./src/screens/GalleryScreen";
import PhotoDetailScreen from "./src/screens/PhotoDetailScreen";
import VideosScreen from "./src/screens/VideosScreen";
import VideoPlayerScreen from "./src/screens/VideoPlayerScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import GlassesScreen from "./src/screens/GlassesScreen";

const Tab = createBottomTabNavigator();
const GalleryStack = createNativeStackNavigator();
const VideoStack = createNativeStackNavigator();

function GalleryStackScreen() {
  return (
    <GalleryStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#16213e" },
        headerTintColor: "#fff",
      }}
    >
      <GalleryStack.Screen name="Gallery" component={GalleryScreen} />
      <GalleryStack.Screen name="PhotoDetail" component={PhotoDetailScreen} options={{ title: "Photo" }} />
    </GalleryStack.Navigator>
  );
}

function VideoStackScreen() {
  return (
    <VideoStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#16213e" },
        headerTintColor: "#fff",
      }}
    >
      <VideoStack.Screen name="Videos" component={VideosScreen} />
      <VideoStack.Screen name="VideoPlayer" component={VideoPlayerScreen} options={{ title: "Video" }} />
    </VideoStack.Navigator>
  );
}

function MainApp() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: "#16213e", borderTopColor: "#333" },
        tabBarActiveTintColor: "#e94560",
        tabBarInactiveTintColor: "#666",
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Glasses"
        component={GlassesScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: "#16213e" },
          headerTintColor: "#fff",
          tabBarLabel: "Glasses",
        }}
      />
      <Tab.Screen
        name="GalleryTab"
        component={GalleryStackScreen}
        options={{ title: "Photos", tabBarLabel: "Photos" }}
      />
      <Tab.Screen
        name="VideoTab"
        component={VideoStackScreen}
        options={{ title: "Videos", tabBarLabel: "Videos" }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: "#16213e" },
          headerTintColor: "#fff",
        }}
      />
    </Tab.Navigator>
  );
}

function Root() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: "#1a1a2e" }}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  return token ? <MainApp /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Root />
      </NavigationContainer>
    </AuthProvider>
  );
}
