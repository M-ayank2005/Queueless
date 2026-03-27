import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import AppButton from "../../components/AppButton";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import { api } from "../../lib/api";
import { RootStackParamList } from "../../navigation/types";
import { QueueEntry } from "../../types";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "QueueStatus">;

export default function QueueStatusScreen({ route }: Props) {
  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState<QueueEntry | null>(null);

  const load = async () => {
    try {
      const response = await api.get(`/queue/status/${route.params.id}`);
      setEntry(response.data);
    } catch {
      Alert.alert("Unable to load status", "Please try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [route.params.id]);

  if (loading) {
    return (
      <AppScreen scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Fetching queue status...</Text>
        </View>
      </AppScreen>
    );
  }

  if (!entry) {
    return (
      <AppScreen>
        <Card>
          <Text style={styles.title}>Queue not found</Text>
          <Text style={styles.muted}>This queue entry no longer exists.</Text>
        </Card>
      </AppScreen>
    );
  }

  const wait = entry.currentEstimatedWait ?? 0;
  const ahead = entry.peopleAhead ?? 0;

  return (
    <AppScreen>
      <Text style={styles.pageTitle}>Queue Status</Text>
      <Card>
        <Text style={styles.ticket}>#{entry._id.slice(-6).toUpperCase()}</Text>
        <Text style={styles.status}>{entry.status.toUpperCase()}</Text>
      </Card>

      <Card>
        <View style={styles.dataRow}>
          <Text style={styles.metricLabel}>People ahead</Text>
          <Text style={styles.metricValue}>{ahead}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.metricLabel}>Estimated wait</Text>
          <Text style={styles.metricValue}>{wait} mins</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>Selected services</Text>
        {entry.selectedServices?.length ? (
          entry.selectedServices.map((service, idx) => (
            <View key={`${service.name}_${idx}`} style={styles.dataRow}>
              <Text style={styles.metricLabel}>{service.name}</Text>
              <Text style={styles.metricLabel}>${service.cost}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>No services listed.</Text>
        )}
      </Card>

      <AppButton title="Refresh" variant="secondary" onPress={load} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  pageTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  ticket: {
    color: colors.primary,
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
  },
  status: {
    color: colors.text,
    textAlign: "center",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 1,
  },
  section: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  metricValue: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16,
  },
});
