import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../components/AppButton";
import AppLoader from "../../components/AppLoader";
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

const DEMO_STORES = [
  { name: "Kirana Store", qr: "7a9cf8d7-c4fa-44fc-881e-93306e9d57ba", icon: "cart-outline" },
  { name: "iTech Repair", qr: "ded50422-e0f1-47ff-9faf-98431a703c38", icon: "hardware-chip-outline" },
  { name: "Pandit Ji Mill", qr: "91a6cab3-b453-40ce-be20-b7d998ab2dbf", icon: "leaf-outline" },
  { name: "Student Services", qr: "6c6af83b-a760-4549-aaf5-18a2510855d8", icon: "school-outline" },
];

export default function ScanJoinScreen({ navigation, route }: Props) {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [qrCode, setQrCode] = useState(route.params?.qrCode || "");
  const [store, setStore] = useState<StoreData | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [loadingStore, setLoadingStore] = useState(false);
  const [joining, setJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const fetchStore = async (code: string) => {
    if (!code) {
      setErrorMessage("Please enter a valid store QR code.");
      return;
    }
    setErrorMessage("");
    try {
      setLoadingStore(true);
      const response = await api.get(`/queue/store/${code}`);
      setStore(response.data);
      setSelected([]);
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Store not found. Please verify the QR code.";
      setErrorMessage(msg);
      showAlert("Store not found", msg);
      setStore(null);
    } finally {
      setLoadingStore(false);
    }
  };

  React.useEffect(() => {
    if (route.params?.qrCode) {
      setQrCode(route.params.qrCode);
      fetchStore(route.params.qrCode);
    }
  }, [route.params?.qrCode]);

  const onScanPress = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        showAlert("Permission needed", "Camera permission is required to scan QR codes.");
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
    setSelected((prev) =>
      prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]
    );
  };

  const selectedServices = useMemo(() => {
    const services = store?.businessProfile?.services || [];
    return selected.map((idx) => services[idx]).filter(Boolean);
  }, [selected, store]);

  const totals = useMemo(() => {
    return selectedServices.reduce(
      (acc, s) => ({
        duration: acc.duration + (s.durationMin || 0),
        cost: acc.cost + (s.cost || 0),
      }),
      { duration: 0, cost: 0 }
    );
  }, [selectedServices]);

  const joinQueue = async () => {
    if (!store?._id) return;
    setErrorMessage("");
    try {
      setJoining(true);
      const response = await api.post("/queue/join", {
        businessId: store._id,
        selectedServices,
      });
      const id = response.data?._id;
      showAlert("Success", "You have joined the queue!");
      if (id) {
        rootNavigation.navigate("QueueStatus", { id });
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Please try again.";
      setErrorMessage(msg);
      showAlert("Could not join", msg);
    } finally {
      setJoining(false);
    }
  };

  return (
    <AppScreen>
      {/* Title Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Scan & Join</Text>
        <Text style={styles.subtitle}>
          Scan a merchant's counter QR code or enter code manually below.
        </Text>
      </View>

      {/* Main Scanner Action Card */}
      <Card style={styles.scanCard}>
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <View style={styles.flex1}>
            <AppButton
              title="Open Camera Scanner"
              onPress={onScanPress}
              icon="camera-outline"
            />
          </View>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR ENTER CODE MANUALLY</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.manualInputRow}>
          <TextInput
            value={qrCode}
            onChangeText={setQrCode}
            placeholder="Paste or type store code"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            style={styles.input}
          />
          <TouchableOpacity
            style={styles.findBtn}
            onPress={() => fetchStore(qrCode.trim())}
            activeOpacity={0.8}
            disabled={loadingStore}
          >
            {loadingStore ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Demo Stores */}
        <View style={styles.quickPickSection}>
          <Text style={styles.quickPickLabel}>Quick Demo Stores:</Text>
          <View style={styles.quickPickRow}>
            {DEMO_STORES.map((s) => (
              <TouchableOpacity
                key={s.qr}
                style={[styles.quickChip, qrCode === s.qr && styles.quickChipActive]}
                onPress={() => {
                  setQrCode(s.qr);
                  fetchStore(s.qr);
                  setScannerOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={s.icon as any}
                  size={14}
                  color={qrCode === s.qr ? colors.primary : colors.muted}
                />
                <Text style={[styles.quickChipText, qrCode === s.qr && styles.quickChipTextActive]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>

      {/* Live QR Camera View */}
      {scannerOpen && (
        <Card style={styles.cameraCard}>
          <View style={styles.scannerHeader}>
            <View style={styles.scannerTitleRow}>
              <View style={styles.livePulse} />
              <Text style={styles.sectionTitle}>Camera Active</Text>
            </View>
            <TouchableOpacity onPress={() => setScannerOpen(false)} activeOpacity={0.7}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cameraWrap}>
            <CameraView
              onBarcodeScanned={handleBarcodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              style={styles.camera}
            />
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.scanTarget}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
                <View style={styles.scanLaser} />
              </View>
              <Text style={styles.overlayText}>Point camera at store QR code</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Loading Store Feedback */}
      {loadingStore && (
        <AppLoader
          message="Finding store..."
          submessage="Retrieving store services and wait times"
          inline
        />
      )}

      {/* Store & Services Details Card */}
      {!loadingStore && store && (
        <Card style={styles.storeDetailCard}>
          <View style={styles.storeInfoRow}>
            <View style={styles.storeBadgeCircle}>
              <Ionicons name="storefront" size={24} color={colors.primary} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.storeDetailName}>{store.businessProfile.shopName}</Text>
              <Text style={styles.storeDetailAddress}>{store.businessProfile.address}</Text>
            </View>
          </View>

          <View style={styles.serviceListHeader}>
            <Text style={styles.serviceSectionHeading}>Select Services to Request</Text>
            <Text style={styles.serviceSectionHint}>Tap to select multiple</Text>
          </View>

          <ScrollView style={styles.servicesWrap} nestedScrollEnabled>
            {store.businessProfile.services.map((service, index) => {
              const active = selected.includes(index);
              return (
                <TouchableOpacity
                  key={`${service.name}_${index}`}
                  style={[styles.serviceRow, active && styles.serviceRowActive]}
                  onPress={() => toggleService(index)}
                  activeOpacity={0.8}
                >
                  <View style={styles.checkboxCircle}>
                    <Ionicons
                      name={active ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={active ? colors.primary : colors.muted}
                    />
                  </View>

                  <View style={styles.flex1}>
                    <Text style={[styles.serviceName, active && styles.serviceNameActive]}>
                      {service.name}
                    </Text>
                    <Text style={styles.serviceMetaDuration}>
                      ⏱ {service.durationMin} mins
                    </Text>
                  </View>

                  <Text style={[styles.price, active && styles.priceActive]}>
                    ${service.cost}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Booking Summary Panel */}
          <View style={styles.summaryBox}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Est. Duration</Text>
              <Text style={styles.summaryValue}>{totals.duration} mins</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Cost</Text>
              <Text style={styles.summaryTotal}>${totals.cost}</Text>
            </View>
          </View>

          <AppButton
            title={`Join Queue (${selectedServices.length} selected)`}
            onPress={joinQueue}
            disabled={selectedServices.length === 0}
            loading={joining}
            icon="ticket-outline"
          />
        </Card>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 6,
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
  scanCard: {
    gap: 14,
    paddingVertical: 18,
  },
  actionRow: {
    flexDirection: "row",
  },
  flex1: {
    flex: 1,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  manualInputRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  findBtn: {
    backgroundColor: colors.primary,
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  findBtnText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
  quickPickSection: {
    marginTop: 6,
    gap: 8,
  },
  quickPickLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  quickPickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardSoft,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  quickChipActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(59, 130, 246, 0.22)",
  },
  quickChipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  quickChipTextActive: {
    color: colors.text,
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
  cameraCard: {
    gap: 12,
    paddingVertical: 16,
  },
  scannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scannerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16,
  },
  closeText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  cameraWrap: {
    height: 280,
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#020617",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(2, 6, 23, 0.35)",
  },
  scanTarget: {
    width: 190,
    height: 190,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  scanLaser: {
    width: "88%",
    height: 2,
    backgroundColor: "#60A5FA",
  },
  overlayText: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 14,
  },
  storeDetailCard: {
    gap: 16,
    paddingVertical: 18,
  },
  storeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  storeBadgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(59, 130, 246, 0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  storeDetailName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  storeDetailAddress: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  serviceListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingTop: 4,
  },
  serviceSectionHeading: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  serviceSectionHint: {
    color: colors.muted,
    fontSize: 12,
  },
  servicesWrap: {
    maxHeight: 280,
  },
  serviceRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.cardSoft,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  serviceRowActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  checkboxCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  serviceName: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  serviceNameActive: {
    color: colors.text,
  },
  serviceMetaDuration: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  price: {
    color: colors.muted,
    fontWeight: "800",
    fontSize: 16,
  },
  priceActive: {
    color: colors.primary,
  },
  summaryBox: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  summaryValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  summaryTotal: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "900",
  },
});
