import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import { AlertCard } from "../../components/AlertCard";
import LogoQ from "../../components/LogoQ";
import { useAuth } from "../../context/AuthContext";
import { AuthStackParamList } from "../../navigation/types";
import { useTheme } from "../../context/ThemeContext";
import { ThemeColors } from "../../theme/colors";
import { typography, radii, spacing } from "../../theme/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [role, setRole] = useState<"customer" | "business">("customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async () => {
    setErrorMsg("");
    if (!name || !email || !phone || !password) {
      setErrorMsg("Please fill in all basic registration fields.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    if (role === "business" && (!businessName || !address)) {
      setErrorMsg("Store name and address are required for business accounts.");
      return;
    }

    if (!agreedToTerms) {
      setErrorMsg("You must agree to the Terms and acknowledge the Privacy Policy.");
      return;
    }

    try {
      setLoading(true);
      const cleanPhoneDigits = phone.replace(/^\+91/, "").trim();
      const formattedPhone = `+91${cleanPhoneDigits}`;

      await register({
        name: name.trim(),
        email: email.trim(),
        phone: formattedPhone,
        password,
        role,
        businessName: role === "business" ? businessName.trim() : undefined,
        address: role === "business" ? address.trim() : undefined,
        agreedToTerms: true,
        privacyPolicyAcknowledged: true,
      });
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Registration failed. Please try again.";
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
                  title="Registration Error"
                  message={errorMsg}
                />
              </View>
            ) : null}

            {/* Role selector tiles */}
            <View style={styles.roleContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setRole("customer")}
                style={[
                  styles.roleTile,
                  role === "customer" && styles.roleTileSelected,
                ]}
              >
                <Ionicons
                  name="person"
                  size={20}
                  color={role === "customer" ? colors.primary : colors.muted}
                />
                <Text
                  style={[
                    styles.roleLabel,
                    role === "customer" && styles.roleLabelSelected,
                  ]}
                >
                  Customer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setRole("business")}
                style={[
                  styles.roleTile,
                  role === "business" && styles.roleTileSelected,
                ]}
              >
                <Ionicons
                  name="business"
                  size={20}
                  color={role === "business" ? colors.primary : colors.muted}
                />
                <Text
                  style={[
                    styles.roleLabel,
                    role === "business" && styles.roleLabelSelected,
                  ]}
                >
                  Business
                </Text>
              </TouchableOpacity>
            </View>

            {/* Full Name */}
            <AppInput
              label="Full Name"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errorMsg) setErrorMsg("");
              }}
              placeholder="Enter your full name"
              style={styles.inputGroup}
            />

            {/* Email */}
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

            {/* Phone Number with non-editable +91 prefix */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <View style={styles.phoneInputRow}>
                <View style={styles.prefixBox}>
                  <Text style={styles.prefixText}>+91</Text>
                </View>
                <View style={styles.prefixDivider} />
                <TextInput
                  style={styles.phoneTextInput}
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="Enter your phonenumber"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Password */}
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

            {/* Business Store Details */}
            {role === "business" && (
              <View style={styles.businessSection}>
                <View style={styles.thinDivider} />
                <Text style={styles.sectionHeading}>Store Details</Text>

                <AppInput
                  label="Store / Business Name"
                  value={businessName}
                  onChangeText={(text) => {
                    setBusinessName(text);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="e.g. Smile Dental Care"
                  style={styles.inputGroup}
                />

                <AppInput
                  label="Store Location & Address"
                  value={address}
                  onChangeText={(text) => {
                    setAddress(text);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="e.g. 123 Health Ave, Suite 4"
                  style={styles.inputGroup}
                />
              </View>
            )}

            {/* Consent checkbox */}
            <View style={styles.consentRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                style={[
                  styles.checkbox,
                  agreedToTerms && styles.checkboxChecked,
                ]}
              >
                {agreedToTerms && (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                )}
              </TouchableOpacity>
              <View style={styles.consentTextWrap}>
                <Text style={styles.consentText}>
                  I agree to the{" "}
                  <Text
                    style={styles.consentLink}
                    onPress={() => navigation.navigate("Terms")}
                  >
                    Terms of Service
                  </Text>{" "}
                  and acknowledge the{" "}
                  <Text
                    style={styles.consentLink}
                    onPress={() => navigation.navigate("PrivacyPolicy")}
                  >
                    Privacy Policy
                  </Text>
                  .
                </Text>
              </View>
            </View>

            {/* Submit button */}
            <View style={styles.buttonWrap}>
              <AppButton
                title={
                  role === "business"
                    ? "Register as Merchant"
                    : "Register as Customer"
                }
                onPress={submit}
                loading={loading}
                loadingText="Creating Account..."
              />
            </View>

            {/* Bottom link: "Already have an account ?" + "Login" */}
            <View
              style={[
                styles.footerRow,
                { paddingBottom: Math.max(insets.bottom, 16) + 16 },
              ]}
            >
              <Text style={styles.footerText}>Already have an account ? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Login")}
                activeOpacity={0.7}
              >
                <Text style={styles.loginLink}>Login</Text>
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
      paddingTop: 28,
    },
    errorContainer: {
      marginBottom: 16,
    },
    roleContainer: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 20,
    },
    roleTile: {
      flex: 1,
      height: 56,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    roleTileSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySubtle,
    },
    roleLabel: {
      fontSize: 15,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    roleLabelSelected: {
      color: colors.primary,
      fontWeight: "600",
    },
    inputGroup: {
      marginBottom: 20,
    },
    fieldLabel: {
      fontSize: 14,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    phoneInputRow: {
      flexDirection: "row",
      alignItems: "center",
      height: 42,
      borderRadius: radii.input,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardSoft,
    },
    prefixBox: {
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    prefixText: {
      fontSize: 15,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.textPrimary,
    },
    prefixDivider: {
      width: 1,
      height: 24,
      backgroundColor: colors.border,
    },
    phoneTextInput: {
      flex: 1,
      height: 42,
      paddingHorizontal: 12,
      fontSize: 15,
      fontFamily: typography.families.interMedium,
      color: colors.textPrimary,
    },
    businessSection: {
      marginTop: 4,
    },
    thinDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
    },
    sectionHeading: {
      fontSize: 16,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.textPrimary,
      marginBottom: 16,
    },
    consentRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginTop: 4,
      marginBottom: 24,
    },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardSoft,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    checkboxChecked: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    consentTextWrap: {
      flex: 1,
    },
    consentText: {
      fontSize: 13,
      fontFamily: typography.families.interRegular,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    consentLink: {
      color: colors.primary,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      textDecorationLine: "underline",
    },
    buttonWrap: {
      marginBottom: 24,
    },
    footerRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    footerText: {
      fontSize: 14,
      fontFamily: typography.families.interRegular,
      color: colors.muted,
    },
    loginLink: {
      fontSize: 14,
      fontFamily: typography.families.interSemiBold,
      fontWeight: "600",
      color: colors.primary,
    },
  });
}
