import React, { useMemo, useState } from "react";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import { useAuth } from "../../context/AuthContext";
import { AuthStackParamList } from "../../navigation/types";
import { useTheme } from "../../context/ThemeContext";
import { ThemeColors } from "../../theme/colors";
import { radii, spacing } from "../../theme/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

/**
 * LoginScreen
 * Handles user authentication with:
 * - Client-side validation
 * - Global session state updates via AuthContext
 * - Dynamic theme color support
 * - Cross-platform feedback
 */
export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async () => {
    setErrorMsg("");
    if (!email || !password) {
      const msg = "Please enter both email and password.";
      setErrorMsg(msg);
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Missing details", msg);
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
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Sign in failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen contentContainerStyle={styles.screenContent} keyboardOffset={20}>
      <View style={styles.container}>
        {/* Top Header Section */}
        <View style={styles.topSection}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate("Welcome")}
            activeOpacity={0.7}
          >
            <View style={styles.backIconCircle}>
              <Ionicons name="arrow-back" size={18} color={colors.text} />
            </View>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to check your active queue status or manage store counters.
            </Text>
          </View>
        </View>

        {/* Center Form Card */}
        <Card variant="elevated" style={styles.formCard}>
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <AppInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="e.g. name@example.com"
            icon="mail-outline"
          />

          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter your password"
            icon="lock-closed-outline"
          />

          <AppButton
            title="Sign In"
            size="lg"
            onPress={submit}
            loading={loading}
            loadingText="Signing In..."
            icon="log-in-outline"
            style={{ marginTop: spacing.xs }}
          />
        </Card>

        {/* Bottom register route */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Register")}
            activeOpacity={0.7}
          >
            <Text style={styles.registerLink}>Create one here</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppScreen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screenContent: {
      flexGrow: 1,
    },
    container: {
      flex: 1,
      justifyContent: "space-between",
      gap: spacing.lg,
    },
    topSection: {
      gap: spacing.md,
      paddingTop: spacing.xs,
    },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      alignSelf: "flex-start",
      paddingVertical: spacing.xs,
    },
    backIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.cardSoft,
      borderColor: colors.border,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    backText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: "600",
    },
    header: {
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 14,
      color: colors.muted,
      lineHeight: 21,
      marginTop: 2,
    },
    formCard: {
      gap: spacing.lg,
      padding: spacing.xl,
      marginVertical: spacing.md,
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.dangerSubtle,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    errorText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: "600",
      flex: 1,
    },
    footerRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingVertical: spacing.md,
    },
    footerText: {
      color: colors.muted,
      fontSize: 14,
    },
    registerLink: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "700",
    },
  });
