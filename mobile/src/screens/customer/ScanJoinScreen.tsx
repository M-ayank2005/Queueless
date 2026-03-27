import React, { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import AppButton from "../../components/AppButton";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import { api } from "../../lib/api";
import { CustomerTabParamList, RootStackParamList } from "../../navigation/types";
import { ServiceItem } from "../../types";
import { colors } from "../../theme/colors";

type StoreData = {
  _id: string;
  businessProfile: {
    shopName: string;
    address: string;
    services: ServiceItem[];
  };
};

type Props = BottomTabScreenProps<CustomerTabParamList, "ScanJoin">;

export default function ScanJoinScreen({ navigation }: Props) {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [store, setStore] = useState<StoreData | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [loadingStore, setLoadingStore] = useState(false);
  const [joining, setJoining] = useState(false);

  const fetchStore = async (code: string) => {
    try {
      setLoadingStore(true);
      const response = await api.get(`/queue/store/${code}`);
      setStore(response.data);
      setSelected([]);
    } catch (error: any) {
      Alert.alert("Store not found", error?.response?.data?.message || "Please verify the QR code.");
      setStore(null);
    } finally {
      setLoadingStore(false);
    }
  };

  const onScanPress = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Permission needed", "Camera permission is required to scan QR codes.");
        return;
      }
    }
    setScannerOpen(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setScannerOpen(false);

    const cleaned = data.includes("/store/") ? data.split("/store/").pop() || "" : data;
    setQrCode(cleaned);
    if (cleaned) {
      fetchStore(cleaned);
    }
  };

  const toggleService = (index: number) => {
    setSelected((prev) => (prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]));
  };

  const selectedServices = useMemo(() => {
    const services = store?.businessProfile?.services || [];
    return selected.map((idx) => services[idx]).filter(Boolean);
  }, [selected, store]);

  const totals = useMemo(() => {
    return selectedServices.reduce(
      (acc, service) => {
        acc.cost += Number(service.cost || 0);
        acc.duration += Number(service.durationMin || 0);
        return acc;
      },
      { cost: 0, duration: 0 }
    );
  }, [selectedServices]);

  const joinQueue = async () => {
    if (!store || selectedServices.length === 0) {
      return;
    }

    try {
      setJoining(true);
      const response = await api.post("/queue/join", {
        businessId: store._id,
        selectedServices,
      });
      const id = response.data?._id;
      Alert.alert("Joined queue", "You are now in line.");
      if (id) {
        rootNavigation.navigate("QueueStatus", { id });
      }
    } catch (error: any) {
      Alert.alert("Could not join", error?.response?.data?.message || "Please try again.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <AppScreen>
      <Text style={styles.title}>Scan & Join</Text>
      <Text style={styles.subtitle}>Scan a store QR code or enter the code manually.</Text>

      <Card>
        <TextInput
          value={qrCode}
          onChangeText={setQrCode}
          placeholder="Enter store QR code"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          style={styles.input}
        />
        <View style={styles.rowButtons}>
          <View style={styles.flex1}>
            <AppButton title="Find Store" onPress={() => fetchStore(qrCode.trim())} loading={loadingStore} />
          </View>
          <View style={styles.flex1}>
            <AppButton title="Open Scanner" variant="secondary" onPress={onScanPress} />
          </View>
        </View>
      </Card>

      {scannerOpen && (
        <Card>
          <Text style={styles.sectionTitle}>Scanner</Text>
          <View style={styles.cameraWrap}>
            <CameraView onBarcodeScanned={handleBarcodeScanned} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} style={styles.camera} />
          </View>
          <AppButton title="Close Scanner" variant="ghost" onPress={() => setScannerOpen(false)} />
        </Card>
      )}

      {store && (
        <Card>
          <Text style={styles.sectionTitle}>{store.businessProfile.shopName}</Text>
          <Text style={styles.subtitle}>{store.businessProfile.address}</Text>

          <ScrollView style={styles.servicesWrap} nestedScrollEnabled>
            {store.businessProfile.services.map((service, index) => {
              const active = selected.includes(index);
              return (
                <TouchableOpacity
                  key={`${service.name}_${index}`}
                  style={[styles.serviceRow, active && styles.serviceRowActive]}
                  onPress={() => toggleService(index)}
                >
                  <View style={styles.flex1}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <Text style={styles.meta}>{service.durationMin} mins</Text>
                  </View>
                  <Text style={styles.price}>${service.cost}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.summary}>
            <Text style={styles.meta}>Total time: {totals.duration} mins</Text>
            <Text style={styles.total}>${totals.cost}</Text>
          </View>

          <AppButton title="Join Queue" onPress={joinQueue} disabled={selectedServices.length === 0} loading={joining} />
        </Card>
      )}
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
  input: {
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  rowButtons: {
    flexDirection: "row",
    gap: 10,
  },
  flex1: {
    flex: 1,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 18,
  },
  cameraWrap: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  camera: {
    width: "100%",
    height: 260,
  },
  servicesWrap: {
    maxHeight: 280,
  },
  serviceRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.cardSoft,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  serviceRowActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(59,130,246,0.22)",
  },
  serviceName: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  price: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16,
  },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  total: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 22,
  },
});
