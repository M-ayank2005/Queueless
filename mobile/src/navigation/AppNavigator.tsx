import React from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { AuthStackParamList, BusinessTabParamList, CustomerTabParamList, RootStackParamList } from "./types";
import WelcomeScreen from "../screens/auth/WelcomeScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import CustomerHomeScreen from "../screens/customer/CustomerHomeScreen";
import ScanJoinScreen from "../screens/customer/ScanJoinScreen";
import BusinessDashboardScreen from "../screens/business/BusinessDashboardScreen";
import ProfileScreen from "../screens/shared/ProfileScreen";
import QueueStatusScreen from "../screens/shared/QueueStatusScreen";
import { colors } from "../theme/colors";

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
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: "home",
            ScanJoin: "qr-code",
            Profile: "person",
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <CustomerTabs.Screen name="Home" component={CustomerHomeScreen} options={{ title: "Queues" }} />
      <CustomerTabs.Screen name="ScanJoin" component={ScanJoinScreen} options={{ title: "Scan" }} />
      <CustomerTabs.Screen name="Profile" component={ProfileScreen} />
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
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Dashboard: "grid",
            Profile: "person",
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <BusinessTabs.Screen name="Dashboard" component={BusinessDashboardScreen} />
      <BusinessTabs.Screen name="Profile" component={ProfileScreen} />
    </BusinessTabs.Navigator>
  );
}

function AppNavigatorInner() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator color={colors.primary} />
      </View>
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
    height: 70,
    paddingBottom: 8,
    paddingTop: 6,
  },
});
