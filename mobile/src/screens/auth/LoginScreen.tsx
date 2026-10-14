import React, { useState } from "react";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import { useAuth } from "../../context/AuthContext";
import { AuthStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

/**
 * LoginScreen
 * Handles user authentication with:
 * - Client-side validation
 * - Global session state updates via AuthContext
 * - Cross-platform error alerts (web & native)
 */
export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  /**
   * Validates form inputs, executes login through AuthContext,
   * and handles backend error responses gracefully.
   */
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
    <AppScreen>
      <View style={styles.container}>
        {/* Top Navigation Row */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate("Welcome")}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Title Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to check your active queue status or manage store queues.
          </Text>
        </View>

        {/* Form Card */}
        <Card style={styles.formCard}>
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <AppInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="e.g. alex@example.com"
          />

          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Enter your account password"
          />

          <View style={styles.buttonSpacing}>
            <AppButton
              title="Sign In"
              onPress={submit}
              loading={loading}
              icon="log-in-outline"
            />
          </View>
        </Card>

        {/* Switch to Register */}
        <View style={styles.footerRow}>
          <Text style={styles.footerPrompt}>Don't have an account?</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Register")}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLink}>Create one</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    gap: 18,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  backText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    gap: 6,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    gap: 16,
    paddingVertical: 20,
  },
  buttonSpacing: {
    marginTop: 6,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.35)",
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    flex: 1,
    color: "#FCA5A5",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  footerPrompt: {
    color: colors.muted,
    fontSize: 14,
  },
  footerLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});
