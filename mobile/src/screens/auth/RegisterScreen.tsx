import React, { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import { useAuth } from "../../context/AuthContext";
import { AuthStackParamList } from "../../navigation/types";
import { UserRole } from "../../types";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [role, setRole] = useState<UserRole>("customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async () => {
    setErrorMsg("");
    if (!name || !email || !phone || !password) {
      const msg = "Please complete all required fields.";
      setErrorMsg(msg);
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Missing details", msg);
      return;
    }

    if (role === "business" && (!businessName || !address)) {
      const msg = "Please enter your business name and store address.";
      setErrorMsg(msg);
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Missing business details", msg);
      return;
    }

    try {
      setLoading(true);
      await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role,
        businessName: role === "business" ? businessName.trim() : undefined,
        address: role === "business" ? address.trim() : undefined,
      });
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Registration failed. Please try again.";
      setErrorMsg(msg);
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Registration failed", msg);
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Select your account type to get started in under a minute.
          </Text>
        </View>

        {/* Role Selector Segmented Controls */}
        <View style={styles.roleContainer}>
          <Pressable
            onPress={() => setRole("customer")}
            style={[styles.roleCard, role === "customer" && styles.roleCardActive]}
          >
            <View
              style={[
                styles.roleIconWrap,
                role === "customer" && styles.roleIconWrapActive,
              ]}
            >
              <Ionicons
                name="person"
                size={18}
                color={role === "customer" ? "#FFFFFF" : colors.muted}
              />
            </View>
            <Text
              style={[
                styles.roleTitle,
                role === "customer" && styles.roleTitleActive,
              ]}
            >
              Customer
            </Text>
            <Text style={styles.roleSubtitle}>Join queues remotely</Text>
          </Pressable>

          <Pressable
            onPress={() => setRole("business")}
            style={[styles.roleCard, role === "business" && styles.roleCardActive]}
          >
            <View
              style={[
                styles.roleIconWrap,
                role === "business" && styles.roleIconWrapActive,
              ]}
            >
              <Ionicons
                name="storefront"
                size={18}
                color={role === "business" ? "#FFFFFF" : colors.muted}
              />
            </View>
            <Text
              style={[
                styles.roleTitle,
                role === "business" && styles.roleTitleActive,
              ]}
            >
              Business
            </Text>
            <Text style={styles.roleSubtitle}>Manage store queues</Text>
          </Pressable>
        </View>

        {/* Registration Form Card */}
        <Card style={styles.formCard}>
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <AppInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Jordan Smith"
          />

          <AppInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="e.g. jordan@example.com"
          />

          <AppInput
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="e.g. +1 555 123 4567"
          />

          {role === "business" && (
            <View style={styles.businessSection}>
              <View style={styles.businessBadge}>
                <Ionicons name="business-outline" size={14} color={colors.primary} />
                <Text style={styles.businessBadgeText}>BUSINESS DETAILS</Text>
              </View>

              <AppInput
                label="Store / Business Name"
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="e.g. Metro Grooming & Spa"
              />

              <AppInput
                label="Store Physical Address"
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. 128 Main Street, Suite 4"
              />
            </View>
          )}

          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Create a strong password (min 6 chars)"
          />

          <View style={styles.buttonSpacing}>
            <AppButton
              title="Create Account"
              onPress={submit}
              loading={loading}
              icon="arrow-forward-outline"
            />
          </View>
        </Card>

        {/* Footer Link */}
        <View style={styles.footerRow}>
          <Text style={styles.footerPrompt}>Already have an account?</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    gap: 16,
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
    gap: 4,
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
  roleContainer: {
    flexDirection: "row",
    gap: 12,
  },
  roleCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 4,
  },
  roleCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.cardSoft,
  },
  roleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  roleIconWrapActive: {
    backgroundColor: colors.primary,
  },
  roleTitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  roleTitleActive: {
    color: colors.text,
  },
  roleSubtitle: {
    color: colors.muted,
    fontSize: 11,
    opacity: 0.8,
  },
  formCard: {
    gap: 14,
    paddingVertical: 20,
  },
  businessSection: {
    gap: 14,
    backgroundColor: "rgba(59, 130, 246, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
    borderRadius: 14,
    padding: 14,
    marginVertical: 4,
  },
  businessBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  businessBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
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
