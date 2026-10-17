import React from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
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
import AppLoader from "../components/AppLoader";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const CustomerTabs = createBottomTabNavigator<CustomerTabParamList>();
const BusinessTabs = createBottomTabNavigator<BusinessTabParamList>();

// 1. Authentication Navigator: Shown when user is not logged in
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// 2. Customer Bottom Tabs: Main navigation experience for customer role
function CustomerTabsNavigator() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const bottomPadding = Math.max(insets.bottom, 8);
  const tabHeight = 56 + bottomPadding;

  return (
    <CustomerTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabHeight,
            paddingBottom: bottomPadding,
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            shadowColor: "#000",
            shadowOpacity: isDark ? 0.25 : 0.04,
          },
        ],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarIcon: ({ color, focused, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home";
          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "ScanJoin") {
            iconName = focused ? "qr-code" : "qr-code-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return (
            <View style={[
              styles.tabIconWrap, 
              focused && { backgroundColor: colors.primarySubtle }
            ]}>
              <Ionicons name={iconName} size={size - 1} color={color} />
            </View>
          );
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

// 3. Business Bottom Tabs: Dedicated workflow for shop owners
function BusinessTabsNavigator() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const bottomPadding = Math.max(insets.bottom, 8);
  const tabHeight = 56 + bottomPadding;

  return (
    <BusinessTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabHeight,
            paddingBottom: bottomPadding,
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            shadowColor: "#000",
            shadowOpacity: isDark ? 0.25 : 0.04,
          },
        ],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarIcon: ({ color, focused, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "grid";
          if (route.name === "Dashboard") {
            iconName = focused ? "grid" : "grid-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return (
            <View style={[
              styles.tabIconWrap, 
              focused && { backgroundColor: colors.primarySubtle }
            ]}>
              <Ionicons name={iconName} size={size - 1} color={color} />
            </View>
          );
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

// 4. Conditional Root Navigator: Role-based routing + auth gate
function AppNavigatorInner() {
  const { loading, user } = useAuth();

  // Shows branded loader while AsyncStorage hydrates saved session
  if (loading) {
    return (
      <AppLoader
        message="Connecting to QueueLess..."
        submessage="Verifying secure session"
        fullScreen
      />
    );
  }

  // Unauthenticated user -> routes to Welcome/Login/Register
  if (!user) {
    return <AuthNavigator />;
  }

  // Authenticated user -> dynamic role segregation (Customer vs Business)
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user.role === "business" ? (
        <RootStack.Screen name="BusinessTabs" component={BusinessTabsNavigator} />
      ) : (
        <RootStack.Screen name="CustomerTabs" component={CustomerTabsNavigator} />
      )}
      {/* Shared modal/detail screen accessible across tabs */}
      <RootStack.Screen name="QueueStatus" component={QueueStatusScreen} />
    </RootStack.Navigator>
  );
}

export default function AppNavigator() {
  const { colors, isDark } = useTheme();

  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.bg,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <AppNavigatorInner />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    paddingTop: 6,
    elevation: 8,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 6,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  tabIconWrap: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
});
