import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
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

  const submit = async () => {
    if (!name || !email || !phone || !password) {
      Alert.alert("Missing details", "Please complete all required fields.");
      return;
    }

    if (role === "business" && (!businessName || !address)) {
      Alert.alert("Missing business details", "Please add business name and address.");
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
      Alert.alert("Registration failed", error?.response?.data?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <View style={styles.wrap}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Choose a role and get started in under a minute.</Text>

        <Card>
          <View style={styles.roleRow}>
            <Pressable
              onPress={() => setRole("customer")}
              style={[styles.roleChip, role === "customer" && styles.roleChipActive]}
            >
              <Text style={[styles.roleText, role === "customer" && styles.roleTextActive]}>Customer</Text>
            </Pressable>
            <Pressable
              onPress={() => setRole("business")}
              style={[styles.roleChip, role === "business" && styles.roleChipActive]}
            >
              <Text style={[styles.roleText, role === "business" && styles.roleTextActive]}>Business</Text>
            </Pressable>
          </View>

          <AppInput label="Full name" value={name} onChangeText={setName} placeholder="Alex Johnson" />
          <AppInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="name@example.com"
          />
          <AppInput
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+1 555 123 4567"
          />

          {role === "business" && (
            <>
              <AppInput
                label="Business name"
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="QueueLess Salon"
              />
              <AppInput
                label="Address"
                value={address}
                onChangeText={setAddress}
                placeholder="221B Baker Street"
              />
            </>
          )}

          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Create a strong password"
          />

          <AppButton title="Create Account" onPress={submit} loading={loading} />
        </Card>

        <AppButton title="Already have an account? Sign in" variant="ghost" onPress={() => navigation.navigate("Login")} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 10,
    gap: 14,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 6,
  },
  roleRow: {
    flexDirection: "row",
    gap: 10,
  },
  roleChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.cardSoft,
    paddingVertical: 12,
    alignItems: "center",
  },
  roleChipActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(59, 130, 246, 0.22)",
  },
  roleText: {
    color: colors.muted,
    fontWeight: "700",
  },
  roleTextActive: {
    color: colors.text,
  },
});
