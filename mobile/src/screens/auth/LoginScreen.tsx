import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import { AlertCard } from "../../components/AlertCard";
import LogoQ from "../../components/LogoQ";
import { useAuth } from "../../context/AuthContext";
import { AuthStackParamList } from "../../navigation/types";
import { useTheme } from "../../context/ThemeContext";
import { ThemeColors } from "../../theme/colors";
import { typography, radii, spacing } from "../../theme/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async () => {
    setErrorMsg("");
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Sign in failed. Please check your credentials.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDark ? colors.bg : colors.primary}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Hero Section */}
          <View style={[styles.hero, { paddingTop: Math.max(insets.top, 20) + 28 }]}>
            <View style={styles.heroLogoRow}>
              <LogoQ size={36} variant="brand" />
              <Text style={styles.heroTitle}>
                Queue<Text style={styles.heroTitleLess}>Less</Text>
              </Text>
            </View>
            <Text style={styles.heroTagline}>Track Your Queue in Real Time</Text>
          </View>

          {/* Sheet overlapping hero */}
          <View style={styles.sheet}>
            {errorMsg ? (
              <View style={styles.errorContainer}>
                <AlertCard
                  type="danger"
                  title="Login Error"
                  message={errorMsg}
                />
              </View>
            ) : null}

            {/* Email field */}
            <AppInput
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errorMsg) setErrorMsg("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Please Enter Your Email"
              style={styles.inputGroup}
            />

            {/* Password field */}
            <AppInput
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errorMsg) setErrorMsg("");
              }}
              secureTextEntry
              placeholder="Please Enter Your Password"
              style={styles.inputGroup}
            />

            {/* Login button */}
            <View style={styles.buttonWrap}>
              <AppButton
                title="Login"
                onPress={submit}
                loading={loading}
                loadingText="Signing In..."
              />
            </View>

            {/* Bottom link: "Don't have an account ?" + "Sign Up" */}
            <View style={[styles.footerRow, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
              <Text style={styles.footerText}>Don't have an account ? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Register")}
                activeOpacity={0.7}
              >
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? colors.bg : colors.primary,
    },
    keyboardAvoid: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    hero: {
      height: 214,
      backgroundColor: isDark ? colors.bgSecondary : colors.primary,
      paddingHorizontal: 16,
    },
    heroLogoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    heroTitle: {
      fontSize: 28,
      fontFamily: typography.families.interSemiBold,
      fontWeight: "600",
      color: "#FFFFFF",
      letterSpacing: -0.3,
    },
    heroTitleLess: {
      color: "#38BDF8",
      fontWeight: "800",
    },
    heroTagline: {
      marginTop: 8,
      fontSize: 14,
      fontFamily: typography.families.interRegular,
      color: "#FFFFFF",
      opacity: 0.9,
    },
    sheet: {
      flex: 1,
      backgroundColor: colors.bg,
      borderTopLeftRadius: radii.loginSheet,
      borderTopRightRadius: radii.loginSheet,
      paddingHorizontal: 16,
      paddingTop: 36,
    },
    errorContainer: {
      marginBottom: 16,
    },
    inputGroup: {
      marginBottom: 24,
    },
    buttonWrap: {
      marginTop: 4,
      marginBottom: 32,
    },
    footerRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: "auto",
    },
    footerText: {
      fontSize: 14,
      fontFamily: typography.families.interRegular,
      color: colors.muted,
    },
    signUpLink: {
      fontSize: 14,
      fontFamily: typography.families.interSemiBold,
      fontWeight: "600",
      color: colors.primary,
    },
  });
}
