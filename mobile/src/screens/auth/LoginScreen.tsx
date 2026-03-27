import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import { useAuth } from "../../context/AuthContext";
import { AuthStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) {
      Alert.alert("Missing details", "Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
    } catch (error: any) {
      Alert.alert("Sign in failed", error?.response?.data?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <View style={styles.wrap}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to continue managing your queues.</Text>

        <Card>
          <AppInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="name@example.com"
          />
          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Your password"
          />
          <AppButton title="Sign In" onPress={submit} loading={loading} />
        </Card>

        <AppButton
          title="New here? Create account"
          variant="ghost"
          onPress={() => navigation.navigate("Register")}
        />
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
});
