import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import { useAuth } from "../../context/AuthContext";
import { BusinessTabParamList, CustomerTabParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";

type Props =
  | BottomTabScreenProps<CustomerTabParamList, "Profile">
  | BottomTabScreenProps<BusinessTabParamList, "Profile">;

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setPhone(user?.phone || "");
  }, [user?.name, user?.phone]);

  const save = async () => {
    try {
      setSaving(true);
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        password: password || undefined,
      });
      setPassword("");
      Alert.alert("Profile updated", "Your changes were saved.");
    } catch (error: any) {
      Alert.alert("Save failed", error?.response?.data?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Manage your account details.</Text>

      <Card>
        <Text style={styles.label}>Role: {user?.role || "-"}</Text>
        <AppInput label="Name" value={name} onChangeText={setName} placeholder="Your name" />
        <AppInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Your phone" />
        <AppInput
          label="New Password (optional)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Leave empty to keep current"
        />

        <AppButton title="Save Changes" onPress={save} loading={saving} />
      </Card>

      <Card style={styles.dangerCard}>
        <Text style={styles.dangerTitle}>Sign out</Text>
        <Text style={styles.subtitle}>You can log in again anytime.</Text>
        <AppButton title="Logout" variant="danger" onPress={logout} />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
    paddingTop: 6,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
  },
  label: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  dangerCard: {
    borderColor: "#552533",
    backgroundColor: "#221019",
  },
  dangerTitle: {
    color: "#FCA5A5",
    fontSize: 18,
    fontWeight: "700",
  },
});
