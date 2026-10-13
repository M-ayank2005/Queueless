import React from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import {
  AuthStackParamList,
  BusinessTabParamList,
  CustomerTabParamList,
  RootStackParamList,
} from "./types";
import WelcomeScreen from "../screens/auth/WelcomeScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import CustomerHomeScreen from "../screens/customer/CustomerHomeScreen";
import ScanJoinScreen from "../screens/customer/ScanJoinScreen";
import BusinessDashboardScreen from "../screens/business/BusinessDashboardScreen";
import ProfileScreen from "../screens/shared/ProfileScreen";
import QueueStatusScreen from "../screens/shared/QueueStatusScreen";
import { colors } from "../theme/colors";
import AppLoader from "../components/AppLoader";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const CustomerTabs = createBottomTabNavigator<CustomerTabParamList>();
const BusinessTabs = createBottomTabNavigator<BusinessTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function CustomerTabsNavigator() {
  return (
    <CustomerTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ color, focused, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home";
          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "ScanJoin") {
            iconName = focused ? "qr-code" : "qr-code-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <CustomerTabs.Screen
        name="Home"
        component={CustomerHomeScreen}
        options={{ title: "Queues" }}
      />
      <CustomerTabs.Screen
        name="ScanJoin"
        component={ScanJoinScreen}
        options={{ title: "Scan & Join" }}
      />
      <CustomerTabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
    </CustomerTabs.Navigator>
  );
}

function BusinessTabsNavigator() {
  return (
    <BusinessTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ color, focused, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "grid";
          if (route.name === "Dashboard") {
            iconName = focused ? "grid" : "grid-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <BusinessTabs.Screen
        name="Dashboard"
        component={BusinessDashboardScreen}
        options={{ title: "Dashboard" }}
      />
      <BusinessTabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Settings" }}
      />
    </BusinessTabs.Navigator>
  );
}

function AppNavigatorInner() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <AppLoader
        message="Connecting to QueueLess..."
        submessage="Verifying secure session"
        fullScreen
      />
    );
  }

  if (!user) {
    return <AuthNavigator />;
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user.role === "business" ? (
        <RootStack.Screen name="BusinessTabs" component={BusinessTabsNavigator} />
      ) : (
        <RootStack.Screen name="CustomerTabs" component={CustomerTabsNavigator} />
      )}
      <RootStack.Screen name="QueueStatus" component={QueueStatusScreen} />
    </RootStack.Navigator>
  );
}

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <AppNavigatorInner />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
});
