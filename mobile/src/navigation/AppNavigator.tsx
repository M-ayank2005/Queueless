import React, { useEffect, useState } from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  AuthStackParamList,
  BusinessTabParamList,
  CustomerTabParamList,
  RootStackParamList,
} from "./types";
import SplashScreen, { ONBOARDING_SEEN_KEY } from "../screens/auth/SplashScreen";
import OnboardingScreen from "../screens/auth/OnboardingScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import CustomerHomeScreen from "../screens/customer/CustomerHomeScreen";
import NotificationsScreen from "../screens/customer/NotificationsScreen";
import UpdatesScreen from "../screens/customer/UpdatesScreen";
import MyQueueScreen from "../screens/customer/MyQueueScreen";
import ScanJoinScreen from "../screens/customer/ScanJoinScreen";
import BusinessDashboardScreen from "../screens/business/BusinessDashboardScreen";
import ProfileScreen from "../screens/shared/ProfileScreen";
import QueueStatusScreen from "../screens/shared/QueueStatusScreen";
import PrivacyPolicyScreen from "../screens/shared/PrivacyPolicyScreen";
import TermsScreen from "../screens/shared/TermsScreen";
import HelpSupportScreen from "../screens/shared/HelpSupportScreen";
import BookingHistoryScreen from "../screens/customer/BookingHistoryScreen";
import BottomTabBar from "../components/BottomTabBar";
import { getUnreadCount } from "../lib/api";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const CustomerTabs = createBottomTabNavigator<CustomerTabParamList>();
const BusinessTabs = createBottomTabNavigator<BusinessTabParamList>();

// 1. Authentication Navigator: Login, Register, Onboarding, and Legal
function AuthNavigator({ initialRoute }: { initialRoute: "Onboarding" | "Login" }) {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <AuthStack.Screen name="Terms" component={TermsScreen} />
      <AuthStack.Screen name="HelpSupport" component={HelpSupportScreen} />
    </AuthStack.Navigator>
  );
}

// 2. Customer Bottom Tabs: Home, Notifications, Updates, MyQueue
function CustomerTabsNavigator() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const pollUnread = async () => {
      try {
        const res = await getUnreadCount();
        if (mounted && typeof res?.unreadCount === "number") {
          setUnreadCount(res.unreadCount);
        }
      } catch {
        // non-blocking
      }
    };

    pollUnread();
    const interval = setInterval(pollUnread, 30000); // Poll every 30s per spec

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <CustomerTabs.Navigator
      tabBar={(props) => <BottomTabBar {...props} unreadCount={unreadCount} />}
      screenOptions={{ headerShown: false }}
    >
      <CustomerTabs.Screen
        name="Home"
        component={CustomerHomeScreen}
        options={{ tabBarAccessibilityLabel: "Home" }}
      />
      <CustomerTabs.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ tabBarAccessibilityLabel: "Notifications" }}
      />
      <CustomerTabs.Screen
        name="Updates"
        component={UpdatesScreen}
        options={{ tabBarAccessibilityLabel: "Updates" }}
      />
      <CustomerTabs.Screen
        name="MyQueue"
        component={MyQueueScreen}
        options={{ tabBarAccessibilityLabel: "My Queue" }}
      />
      <CustomerTabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarAccessibilityLabel: "Profile" }}
      />
    </CustomerTabs.Navigator>
  );
}

// 3. Business Bottom Tabs: Dashboard, Notifications, and Profile (3 balanced tabs)
function BusinessTabsNavigator() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const pollUnread = async () => {
      try {
        const res = await getUnreadCount();
        if (mounted && typeof res?.unreadCount === "number") {
          setUnreadCount(res.unreadCount);
        }
      } catch {
        // non-blocking
      }
    };

    pollUnread();
    const interval = setInterval(pollUnread, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <BusinessTabs.Navigator
      tabBar={(props) => (
        <BottomTabBar {...props} unreadCount={unreadCount} isBusiness />
      )}
      screenOptions={{ headerShown: false }}
    >
      <BusinessTabs.Screen
        name="Dashboard"
        component={BusinessDashboardScreen}
        options={{ tabBarAccessibilityLabel: "Dashboard" }}
      />
      <BusinessTabs.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ tabBarAccessibilityLabel: "Notifications" }}
      />
      <BusinessTabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarAccessibilityLabel: "Profile" }}
      />
    </BusinessTabs.Navigator>
  );
}

// 4. Conditional Root Navigator: Role-based routing + auth gate
function AppNavigatorInner() {
  const { loading, user } = useAuth();
  const [splashFinished, setSplashFinished] = useState(false);
  const [initialAuthRoute, setInitialAuthRoute] = useState<"Onboarding" | "Login">("Onboarding");

  useEffect(() => {
    let isMounted = true;
    const startTimer = Date.now();

    const checkInit = async () => {
      let seen = false;
      try {
        const val = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
        seen = val === "true";
      } catch {
        // fallback
      }

      const elapsed = Date.now() - startTimer;
      const remaining = Math.max(0, 1200 - elapsed);
      await new Promise((resolve) => setTimeout(resolve, remaining));

      if (isMounted) {
        setInitialAuthRoute(seen ? "Login" : "Onboarding");
        setSplashFinished(true);
      }
    };

    if (!loading) {
      checkInit();
    }

    return () => {
      isMounted = false;
    };
  }, [loading]);

  // Shows Launch first screen (Splash) during session hydration and 1.2s display timer
  if (loading || !splashFinished) {
    return <SplashScreen />;
  }

  // Unauthenticated user -> routes to Onboarding (if new) or Login (if seen)
  if (!user) {
    return <AuthNavigator initialRoute={initialAuthRoute} />;
  }

  // Authenticated user -> dynamic role segregation (Customer vs Business)
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user.role === "business" ? (
        <RootStack.Screen name="BusinessTabs" component={BusinessTabsNavigator} />
      ) : (
        <RootStack.Screen name="CustomerTabs" component={CustomerTabsNavigator} />
      )}
      <RootStack.Screen name="ScanJoin" component={ScanJoinScreen} />
      <RootStack.Screen name="Profile" component={ProfileScreen} />
      <RootStack.Screen name="QueueStatus" component={QueueStatusScreen} />
      <RootStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <RootStack.Screen name="Terms" component={TermsScreen} />
      <RootStack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <RootStack.Screen name="BookingHistory" component={BookingHistoryScreen} />
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
