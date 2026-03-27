import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import AppButton from "../../components/AppButton";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import { api } from "../../lib/api";
import { BusinessTabParamList } from "../../navigation/types";
import { QueueEntry, ServiceItem } from "../../types";
import { colors } from "../../theme/colors";

type BusinessProfileResponse = {
  shopName: string;
  address: string;
  uniqueQrCode: string;
  services: ServiceItem[];
};

type Props = BottomTabScreenProps<BusinessTabParamList, "Dashboard">;

export default function BusinessDashboardScreen(_: Props) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<BusinessProfileResponse | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [cost, setCost] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [profileRes, queueRes] = await Promise.all([api.get("/business/me"), api.get("/business/queue")]);
      setProfile(profileRes.data);
      setQueue(queueRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeQueue = useMemo(
    () => queue.filter((item) => item.status === "waiting" || item.status === "in_progress"),
    [queue]
  );

  const addService = async () => {
    if (!profile || !serviceName || !durationMin || !cost) {
      Alert.alert("Missing fields", "Please fill all service fields.");
      return;
    }

    const updated = [
      ...(profile.services || []),
      { name: serviceName.trim(), durationMin: Number(durationMin), cost: Number(cost) },
    ];

    try {
      const response = await api.put("/business/services", { services: updated });
      setProfile((prev) => (prev ? { ...prev, services: response.data.services } : prev));
      setServiceName("");
      setDurationMin("");
      setCost("");
    } catch {
      Alert.alert("Unable to save", "Could not update services.");
    }
  };

  const removeService = async (index: number) => {
    if (!profile) return;
    const updated = [...profile.services];
    updated.splice(index, 1);

    try {
      const response = await api.put("/business/services", { services: updated });
      setProfile((prev) => (prev ? { ...prev, services: response.data.services } : prev));
    } catch {
      Alert.alert("Unable to remove", "Please try again.");
    }
  };

  const updateStatus = async (id: string, status: "completed" | "cancelled") => {
    try {
      await api.put(`/business/queue/${id}/status`, { status });
      await load();
    } catch {
      Alert.alert("Status update failed", "Please retry.");
    }
  };

  if (loading) {
    return (
      <AppScreen>
        <Text style={styles.loading}>Loading dashboard...</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <Text style={styles.title}>{profile?.shopName || "Business Dashboard"}</Text>
      <Text style={styles.subtitle}>{profile?.address}</Text>

      <Card>
        <Text style={styles.section}>Store QR Code</Text>
        <Text style={styles.qrText}>{profile?.uniqueQrCode || "-"}</Text>
        <Text style={styles.meta}>Share this code or URL: /store/{profile?.uniqueQrCode}</Text>
      </Card>

      <Card>
        <Text style={styles.section}>Active Queue ({activeQueue.length})</Text>
        {activeQueue.length === 0 ? (
          <Text style={styles.meta}>No customers waiting right now.</Text>
        ) : (
          activeQueue.map((item) => (
            <View key={item._id} style={styles.queueRow}>
              <View style={styles.flex1}>
                <Text style={styles.customerName}>{item.customerId?.name || item.customerId || "Customer"}</Text>
                <Text style={styles.meta}>#{item._id.slice(-4).toUpperCase()} • {item.status}</Text>
                <Text style={styles.meta}>{item.selectedServices?.map((service) => service.name).join(", ")}</Text>
              </View>
              <View style={styles.actions}>
                <AppButton title="Done" onPress={() => updateStatus(item._id, "completed")} variant="secondary" />
                <AppButton title="Cancel" onPress={() => updateStatus(item._id, "cancelled")} variant="danger" />
              </View>
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.section}>Services</Text>
        {(profile?.services || []).map((service, index) => (
          <View key={`${service.name}_${index}`} style={styles.serviceRow}>
            <View>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.meta}>{service.durationMin} mins • ${service.cost}</Text>
            </View>
            <TouchableOpacity onPress={() => removeService(index)}>
              <Text style={styles.remove}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}

        <ScrollView horizontal style={styles.inputsWrap}>
          <TextInput
            style={[styles.input, styles.inputWide]}
            placeholder="Service"
            placeholderTextColor={colors.muted}
            value={serviceName}
            onChangeText={setServiceName}
          />
          <TextInput
            style={styles.input}
            placeholder="Mins"
            placeholderTextColor={colors.muted}
            value={durationMin}
            onChangeText={setDurationMin}
            keyboardType="number-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Cost"
            placeholderTextColor={colors.muted}
            value={cost}
            onChangeText={setCost}
            keyboardType="number-pad"
          />
        </ScrollView>
        <AppButton title="Add Service" onPress={addService} />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    color: colors.muted,
    fontSize: 16,
    marginTop: 24,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 6,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
  },
  section: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 18,
  },
  qrText: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: "800",
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  queueRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.cardSoft,
    flexDirection: "row",
    gap: 10,
  },
  customerName: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
  },
  flex1: {
    flex: 1,
    gap: 4,
  },
  actions: {
    width: 86,
    gap: 8,
  },
  serviceRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.cardSoft,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceName: {
    color: colors.text,
    fontWeight: "700",
  },
  remove: {
    color: colors.danger,
    fontWeight: "700",
  },
  inputsWrap: {
    marginVertical: 8,
  },
  input: {
    width: 90,
    marginRight: 8,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputWide: {
    width: 180,
  },
});
