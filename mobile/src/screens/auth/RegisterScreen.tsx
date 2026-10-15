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
import { colors } from "../../theme/colors";
import { radii, shadows, spacing, typography } from "../../theme/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [role, setRole] = useState<"customer" | "business">("customer");
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
      const msg = "Please fill in all basic registration fields.";
      setErrorMsg(msg);
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Incomplete form", msg);
      return;
    }

    if (password.length < 6) {
      const msg = "Password must be at least 6 characters.";
      setErrorMsg(msg);
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Weak password", msg);
      return;
    }

    if (role === "business" && (!businessName || !address)) {
      const msg = "Store name and location are required for merchant accounts.";
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
    <AppScreen contentContainerStyle={styles.screenContent} keyboardOffset={20}>
      <View style={styles.container}>
        <View style={styles.topSection}>
          {/* Back navigation */}
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

          {/* Title Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Choose your account role to set up your virtual queue profile.
            </Text>
          </View>

          {/* Role Selector Segmented Controls */}
        <View style={styles.roleContainer}>
          <Pressable
            onPress={() => {
              setRole("customer");
              setErrorMsg("");
            }}
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
            onPress={() => {
              setRole("business");
              setErrorMsg("");
            }}
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
            <Text style={styles.roleSubtitle}>Manage store counters</Text>
          </Pressable>
        </View>

        {/* Registration Form Card */}
        <Card variant="elevated" style={styles.formCard}>
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <AppInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Mayank Patel"
            icon="person-outline"
          />

          <AppInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="e.g. mayank@example.com"
            icon="mail-outline"
          />

          <AppInput
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="e.g. +91 98765 43210"
            icon="call-outline"
          />

          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="At least 6 characters"
            icon="lock-closed-outline"
          />

          {role === "business" ? (
            <View style={styles.businessFieldsWrap}>
              <View style={styles.divider} />
              <Text style={styles.businessSectionTitle}>Store Details</Text>

              <AppInput
                label="Store / Business Name"
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="e.g. Kirana General Store"
                icon="storefront-outline"
              />

              <AppInput
                label="Store Location & Address"
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. Shop 12, Main Market, LKO"
                icon="location-outline"
              />
            </View>
          ) : null}

          <AppButton
            title={`Register as ${role === "business" ? "Merchant" : "Customer"}`}
            size="lg"
            onPress={submit}
            loading={loading}
            icon="checkmark-circle-outline"
            style={{ marginTop: spacing.xs }}
          />
        </Card>
      </View>

      {/* Bottom sign-in route */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
          activeOpacity={0.7}
        >
          <Text style={styles.loginLink}>Sign in here</Text>
        </TouchableOpacity>
      </View>
    </View>
  </AppScreen>
);
}

const styles = StyleSheet.create({
screenContent: {
  flexGrow: 1,
},
container: {
  flex: 1,
  justifyContent: "space-between",
  gap: spacing.lg,
},
topSection: {
  gap: spacing.lg,
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
    width: 34,
    height: 34,
    borderRadius: 17,
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
    lineHeight: 20,
  },
  roleContainer: {
    flexDirection: "row",
    gap: spacing.md,
  },
  roleCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: 4,
  },
  roleCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.cardElevated,
    ...shadows.glow,
  },
  roleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  roleIconWrapActive: {
    backgroundColor: colors.primary,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  roleTitleActive: {
    color: colors.primaryHover,
  },
  roleSubtitle: {
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
  },
  formCard: {
    gap: spacing.lg,
    padding: spacing.xl,
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
  businessFieldsWrap: {
    gap: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  businessSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  footerText: {
    color: colors.muted,
    fontSize: 14,
  },
  loginLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});
