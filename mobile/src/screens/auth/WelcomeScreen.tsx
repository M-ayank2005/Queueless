import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/types";
import AppButton from "../../components/AppButton";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <AppScreen scroll={false}>
      <View style={styles.centered}>
        <Text style={styles.badge}>QUEUELESS MOBILE</Text>
        <Text style={styles.title}>Skip Lines. Keep Life Moving.</Text>
        <Text style={styles.subtitle}>
          Join queues, track status, and manage store flow from your phone.
        </Text>

        <Card style={styles.actionsCard}>
          <AppButton title="Sign In" onPress={() => navigation.navigate("Login")} />
          <AppButton
            title="Create Account"
            variant="secondary"
            onPress={() => navigation.navigate("Register")}
          />
        </Card>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 8,
    gap: 14,
  },
  badge: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  actionsCard: {
    marginTop: 8,
    gap: 12,
  },
});
