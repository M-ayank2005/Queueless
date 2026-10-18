import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
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
import QueueFlowInline from "../../components/loading/QueueFlowInline";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import { api } from "../../lib/api";
import { CustomerTabParamList, RootStackParamList } from "../../navigation/types";
import { ServiceItem } from "../../types";
import { useTheme } from "../../context/ThemeContext";
import { ThemeColors } from "../../theme/colors";
import { radii, shadows, spacing, typography } from "../../theme/theme";

type StoreData = {
  _id: string;
  isFavorite?: boolean;
  businessProfile: {
    shopName: string;
    address: string;
    services: ServiceItem[];
  };
};

type Props = BottomTabScreenProps<CustomerTabParamList, "ScanJoin">;

export default function ScanJoinScreen({ navigation, route }: Props) {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [qrCode, setQrCode] = useState(route.params?.qrCode || "");
  const [store, setStore] = useState<StoreData | null>(null);
  const [serviceQuantities, setServiceQuantities] = useState<Record<string, number>>({});
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingStore, setLoadingStore] = useState(false);
  const [joining, setJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);

  // Animated laser bar for camera scanner
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (scannerOpen) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1600,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [scannerOpen]);

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
      setIsFavorite(Boolean(response.data?.isFavorite));

      if (response.data?.activeTicket) {
        setActiveTicket(response.data.activeTicket);
        const initQuantities: Record<string, number> = {};
        response.data.activeTicket.selectedServices?.forEach((s: any) => {
          initQuantities[s.name] = s.quantity || 1;
        });
        setServiceQuantities(initQuantities);
      } else {
        setActiveTicket(null);
        setServiceQuantities({});
        setIsEditing(false);
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Store not found. Please verify the QR code.";
      setErrorMessage(msg);
      showAlert("Store not found", msg);
      setStore(null);
      setIsFavorite(false);
      setActiveTicket(null);
    } finally {
      setLoadingStore(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!store?._id || togglingFav) return;
    setTogglingFav(true);
    try {
      const res = await api.post("/queue/favorites/toggle", { businessId: store._id });
      const nextFav = Boolean(res.data?.isFavorite);
      setIsFavorite(nextFav);
      showAlert(
        nextFav ? "Store Saved" : "Store Removed",
        nextFav ? "Added to your saved stores for fast 1-tap rebooking." : "Removed from your saved stores."
      );
    } catch (err: any) {
      showAlert("Error", err.response?.data?.message || "Failed to update saved store.");
    } finally {
      setTogglingFav(false);
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
        showAlert("Camera access needed", "Please grant camera permission to scan merchant counter codes.");
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

  const setQuantity = (serviceName: string, delta: number) => {
    setServiceQuantities((prev) => {
      const current = prev[serviceName] || 0;
      const next = Math.max(0, Math.min(50, current + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[serviceName];
        return copy;
      }
      return { ...prev, [serviceName]: next };
    });
  };

  const selectedServices = useMemo(() => {
    const services = store?.businessProfile?.services || [];
    return services
      .filter((s) => (serviceQuantities[s.name] || 0) > 0)
      .map((s) => ({
        name: s.name,
        quantity: serviceQuantities[s.name],
        durationMin: s.durationMin,
        cost: s.cost,
      }));
  }, [serviceQuantities, store]);

  const totals = useMemo(() => {
    return selectedServices.reduce(
      (acc, s) => ({
        duration: acc.duration + (s.durationMin || 0) * (s.quantity || 1),
        cost: acc.cost + (s.cost || 0) * (s.quantity || 1),
      }),
      { duration: 0, cost: 0 }
    );
  }, [selectedServices]);

  const handleUpdateServices = async () => {
    if (!activeTicket?._id) return;
    if (selectedServices.length === 0) {
      showAlert("No services selected", "Please select at least one service.");
      return;
    }
    setJoining(true);
    try {
      await api.put(`/queue/${activeTicket._id}/services`, {
        selectedServices,
      });
      showAlert("Services Updated", "Your service requests have been updated while preserving your spot in line.");
      rootNavigation.navigate("QueueStatus", { id: activeTicket._id });
    } catch (error: any) {
      showAlert("Update Failed", error.response?.data?.message || "Could not update services.");
    } finally {
      setJoining(false);
    }
  };

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
      showAlert("Spot Reserved!", "You have successfully joined the virtual queue.");
      if (id) {
        rootNavigation.navigate("QueueStatus", { id });
      }
    } catch (error: any) {
      if (error?.response?.status === 409 && error?.response?.data?.activeTicket) {
        const existing = error.response.data.activeTicket;
        setActiveTicket(existing);
        const initQuantities: Record<string, number> = {};
        existing.selectedServices?.forEach((s: any) => {
          initQuantities[s.name] = s.quantity || 1;
        });
        setServiceQuantities(initQuantities);
        showAlert(
          "Already in Queue",
          `You already have ticket #${existing._id?.slice(-4).toUpperCase()} in this queue. You can view your live status or edit your services.`
        );
      } else {
        const msg = error?.response?.data?.message || "Please try again.";
        setErrorMessage(msg);
        showAlert("Could not join", msg);
      }
    } finally {
      setJoining(false);
    }
  };

  return (
    <AppScreen hasTabBar>
      {/* Title Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="qr-code" size={20} color={colors.primary} />
          </View>
          <View style={styles.headerTextCol}>
            <Text style={styles.title}>Scan & Join</Text>
            <Text style={styles.subtitle}>
              Scan a merchant's counter code or enter code manually below.
            </Text>
          </View>
        </View>
      </View>

      {/* Main Scanner Action Card */}
      <Card variant="elevated" style={styles.scanCard}>
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <AppButton
          title="Open Camera Scanner"
          size="lg"
          onPress={onScanPress}
          icon="camera-outline"
        />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR ENTER CODE MANUALLY</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.manualInputRow}>
          <View style={styles.inputWrap}>
            <Ionicons name="keypad-outline" size={18} color={colors.muted} style={{ marginLeft: 12 }} />
            <TextInput
              value={qrCode}
              onChangeText={setQrCode}
              placeholder="Paste or type store code"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <TouchableOpacity
            style={styles.findBtn}
            onPress={() => fetchStore(qrCode.trim())}
            activeOpacity={0.8}
            disabled={loadingStore}
          >
            {loadingStore ? (
              <QueueFlowInline color="#FFF" />
            ) : (
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </Card>

      {/* Live QR Camera Scanner View */}
      {scannerOpen && (
        <Card variant="glow" style={styles.cameraCard}>
          <View style={styles.scannerHeader}>
            <View style={styles.scannerTitleRow}>
              <View style={styles.livePulse} />
              <Text style={styles.sectionTitle}>Align QR Code within Frame</Text>
            </View>
            <TouchableOpacity onPress={() => setScannerOpen(false)} activeOpacity={0.7}>
              <Text style={styles.closeText}>Cancel</Text>
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

                <Animated.View
                  style={[
                    styles.scanLaser,
                    {
                      transform: [
                        {
                          translateY: laserAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 180],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </Card>
      )}

      {/* Loaded Store Details & Service Selection Form */}
      {store && (
        <Card variant="elevated" style={styles.storeDetailCard}>
          <View style={styles.storeHeader}>
            <View style={styles.storeIconCircle}>
              <Ionicons name="storefront" size={24} color={colors.primary} />
            </View>
            <View style={styles.storeHeaderInfo}>
              <Text style={styles.storeName}>{store.businessProfile?.shopName || "QueueLess Merchant"}</Text>
              <Text style={styles.storeAddress}>{store.businessProfile?.address || "Store Location"}</Text>
            </View>
            <TouchableOpacity
              onPress={handleToggleFavorite}
              disabled={togglingFav}
              style={{
                padding: 7,
                borderRadius: radii.md,
                backgroundColor: isFavorite ? "rgba(239, 68, 68, 0.15)" : colors.cardSoft,
                borderWidth: 1,
                borderColor: isFavorite ? "rgba(239, 68, 68, 0.4)" : colors.border,
                marginRight: 6,
              }}
              activeOpacity={0.7}
              accessibilityLabel={isFavorite ? "Remove from saved stores" : "Save store"}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={18}
                color={isFavorite ? colors.danger : colors.muted}
              />
            </TouchableOpacity>
            <StatusBadge status="open" label="READY" size="sm" />
          </View>

          <View style={styles.dividerLine} />

          {/* Repeat Scan Active Ticket Banner */}
          {activeTicket ? (
            <View style={styles.activeTicketBanner}>
              <View style={styles.activeTicketHeader}>
                <View style={styles.activeTicketIconWrap}>
                  <Ionicons name="time" size={20} color={colors.primary} />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.activeTicketTitle}>
                    You're in Line! (#{activeTicket._id?.slice(-4).toUpperCase()})
                  </Text>
                  <Text style={styles.activeTicketSub}>
                    Status: {activeTicket.status?.toUpperCase()} • {activeTicket.peopleAhead ?? 0} people ahead
                  </Text>
                </View>
              </View>

              <View style={styles.activeTicketActions}>
                <TouchableOpacity
                  style={styles.activeTicketPrimaryBtn}
                  onPress={() => rootNavigation.navigate("QueueStatus", { id: activeTicket._id })}
                  activeOpacity={0.8}
                >
                  <Ionicons name="eye-outline" size={15} color="#FFF" />
                  <Text style={styles.activeTicketPrimaryBtnText}>View Ticket Status</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.activeTicketEditBtn, isEditing && styles.activeTicketEditBtnActive]}
                  onPress={() => setIsEditing(!isEditing)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={15} color={isEditing ? colors.primary : colors.text} />
                  <Text style={[styles.activeTicketEditText, isEditing && styles.activeTicketEditTextActive]}>
                    {isEditing ? "Done Editing" : "Edit Services"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View style={styles.servicesSection}>
            <Text style={styles.servicesTitle}>
              {activeTicket && !isEditing
                ? "Your Requested Services:"
                : "Select Services & Quantities:"}
            </Text>

            {store.businessProfile?.services?.length ? (
              <View style={styles.servicesList}>
                {store.businessProfile.services.map((service, index) => {
                  const qty = serviceQuantities[service.name] || 0;
                  const isChecked = qty > 0;
                  const canEdit = !activeTicket || isEditing;

                  return (
                    <View
                      key={`${service.name}_${index}`}
                      style={[styles.serviceItem, isChecked && styles.serviceItemChecked]}
                    >
                      <TouchableOpacity
                        style={styles.serviceTextCol}
                        onPress={() => {
                          if (canEdit) {
                            setQuantity(service.name, qty > 0 ? -qty : 1);
                          }
                        }}
                        activeOpacity={canEdit ? 0.7 : 1}
                      >
                        <Text style={styles.serviceName}>{service.name}</Text>
                        <Text style={styles.serviceMeta}>
                          ⏱ {service.durationMin} mins • ${service.cost} each
                        </Text>
                        {qty > 1 ? (
                          <Text style={styles.serviceSubtotal}>
                            Total: ${service.cost * qty} (~{service.durationMin * qty} mins)
                          </Text>
                        ) : null}
                      </TouchableOpacity>

                      {/* Stepper Controls */}
                      {canEdit ? (
                        <View style={styles.stepperWrap}>
                          <TouchableOpacity
                            style={[styles.stepperBtn, qty === 0 && styles.stepperBtnDisabled]}
                            onPress={() => setQuantity(service.name, -1)}
                            disabled={qty === 0}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="remove" size={16} color={qty === 0 ? colors.muted : colors.text} />
                          </TouchableOpacity>

                          <View style={[styles.countBadge, qty > 0 && styles.countBadgeActive]}>
                            <Text style={[styles.countBadgeText, qty > 0 && styles.countBadgeTextActive]}>
                              {qty}
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={styles.stepperBtn}
                            onPress={() => setQuantity(service.name, 1)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="add" size={16} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={[styles.countBadge, qty > 0 && styles.countBadgeActive]}>
                          <Text style={[styles.countBadgeText, qty > 0 && styles.countBadgeTextActive]}>
                            ×{qty}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noServicesText}>
                This merchant provides general counter service with standard wait times.
              </Text>
            )}
          </View>

          {/* Totals Summary */}
          {selectedServices.length > 0 && (
            <View style={styles.totalsCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Estimated Total Duration:</Text>
                <Text style={styles.totalValue}>~{totals.duration} mins</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Estimated Service Total:</Text>
                <Text style={[styles.totalValue, { color: colors.successLight }]}>
                  ${totals.cost}
                </Text>
              </View>
            </View>
          )}

          {activeTicket ? (
            isEditing ? (
              <AppButton
                title="Save Changes (Keep Spot)"
                size="lg"
                onPress={handleUpdateServices}
                loading={joining}
                loadingText="Updating Services..."
                icon="checkmark-circle-outline"
              />
            ) : (
              <AppButton
                title="View My Live Ticket"
                size="lg"
                onPress={() => rootNavigation.navigate("QueueStatus", { id: activeTicket._id })}
                icon="ticket-outline"
              />
            )
          ) : (
            <AppButton
              title="Confirm & Join Queue"
              size="lg"
              onPress={joinQueue}
              loading={joining}
              loadingText="Securing Spot..."
              icon="ticket-outline"
            />
          )}
        </Card>
      )}

      {/* Educational 3-Step Guide (eliminates the dead empty space from Screenshot 5) */}
      {!store && !scannerOpen && (
        <Card variant="subtle" style={styles.guideCard}>
          <Text style={styles.guideTitle}>How Virtual Queueing Works</Text>

          <View style={styles.guideStep}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepTextCol}>
              <Text style={styles.stepTitle}>Scan on Arrival or Remotely</Text>
              <Text style={styles.stepDesc}>
                Aim camera at merchant's counter QR poster or enter their store code manually.
              </Text>
            </View>
          </View>

          <View style={styles.guideStep}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepTextCol}>
              <Text style={styles.stepTitle}>Choose Services & Get Ticket</Text>
              <Text style={styles.stepDesc}>
                Select required services to see accurate price and duration estimates.
              </Text>
            </View>
          </View>

          <View style={styles.guideStep}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepTextCol}>
              <Text style={styles.stepTitle}>Track Real-Time Queue Position</Text>
              <Text style={styles.stepDesc}>
                Relax nearby while tracking people ahead and walk in when it's your turn.
              </Text>
            </View>
          </View>
        </Card>
      )}
    </AppScreen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  flex1: {
    flex: 1,
  },
  header: {
    paddingBottom: spacing.xs,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginTop: 2,
    flexWrap: "wrap",
  },
  scanCard: {
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.mutedDark,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  manualInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    minHeight: 48,
  },
  input: {
    flex: 1,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
  findBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  scannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scannerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  closeText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
  },
  cameraWrap: {
    height: 250,
    borderRadius: radii.md,
    overflow: "hidden",
    position: "relative",
  },
  camera: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(2, 6, 23, 0.4)",
  },
  scanTarget: {
    width: 190,
    height: 190,
    position: "relative",
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
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLaser: {
    width: "100%",
    height: 2,
    backgroundColor: colors.primary,
    ...shadows.glow,
  },
  storeDetailCard: {
    gap: spacing.lg,
    padding: spacing.xl,
  },
  storeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  storeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  storeHeaderInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    marginRight: spacing.xs,
  },
  storeName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    flexWrap: "wrap",
  },
  storeAddress: {
    fontSize: 13,
    color: colors.muted,
  },
  servicesSection: {
    gap: spacing.sm,
  },
  servicesTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  servicesList: {
    gap: spacing.sm,
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  serviceItemChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.cardElevated,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  serviceTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    flexWrap: "wrap",
  },
  serviceMeta: {
    fontSize: 12,
    color: colors.muted,
  },
  serviceCost: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.successLight,
    flexShrink: 0,
  },
  noServicesText: {
    color: colors.muted,
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: spacing.sm,
  },
  totalsCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  guideCard: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.1,
  },
  guideStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primary,
  },
  stepTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    flexWrap: "wrap",
  },
  stepDesc: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 17,
    flexWrap: "wrap",
  },

  /* Repeat Scan Active Ticket Banner */
  activeTicketBanner: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primaryBorder,
    borderWidth: 1.5,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  activeTicketHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  activeTicketIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTicketTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  activeTicketSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  activeTicketActions: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  activeTicketPrimaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  activeTicketPrimaryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  activeTicketEditBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  activeTicketEditBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  activeTicketEditText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  activeTicketEditTextActive: {
    color: colors.primary,
  },

  /* Stepper Controls */
  stepperWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.cardSoft,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.cardElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  countBadge: {
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeActive: {
    transform: [{ scale: 1.05 }],
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.muted,
  },
  countBadgeTextActive: {
    color: colors.primary,
  },
  serviceSubtotal: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    marginTop: 2,
  },
});
