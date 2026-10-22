import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  StatusBar,
  Alert,
  Platform,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../navigation/types";
import { api } from "../../lib/api";
import { ServiceItem } from "../../types";
import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import { AlertCard } from "../../components/AlertCard";
import StatusPill from "../../components/StatusPill";
import { QRScannerModal } from "../../components/QRScannerModal";
import { LogoQ } from "../../components/LogoQ";
import {
  ClockIcon,
  PinIcon,
  HeartIcon,
  ChevronBackIcon,
} from "../../assets/icons/AppIcons";
import { useTheme } from "../../context/ThemeContext";
import { ThemeColors } from "../../theme/colors";
import { typography, radii, shadows } from "../../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "ScanJoin">;

type StoreData = {
  _id: string;
  isFavorite?: boolean;
  isOpen?: boolean;
  closedReason?: string;
  activeTicket?: any;
  businessProfile: {
    shopName: string;
    address: string;
    uniqueQrCode?: string;
    services: ServiceItem[];
    workingHours?: {
      openTime: string;
      closeTime: string;
      closedDays: number[];
      timezone?: string;
    };
  };
};

export default function ScanJoinScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [qrCodeInput, setQrCodeInput] = useState(route.params?.qrCode || "");
  const [store, setStore] = useState<StoreData | null>(null);
  const [serviceQuantities, setServiceQuantities] = useState<Record<string, number>>({});
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingStore, setLoadingStore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  const fetchStore = async (code: string) => {
    if (!code || !code.trim()) {
      setErrorMessage("Please enter a valid store QR code.");
      return;
    }
    setErrorMessage("");
    try {
      setLoadingStore(true);
      const res = await api.get(`/queue/store/${code.trim()}`);
      const data: StoreData = res.data;
      setStore(data);
      setIsFavorite(Boolean(data.isFavorite));

      if (data.activeTicket) {
        setActiveTicket(data.activeTicket);
        const initQuantities: Record<string, number> = {};
        data.activeTicket.selectedServices?.forEach((s: any) => {
          initQuantities[s.name] = s.quantity || 1;
        });
        setServiceQuantities(initQuantities);
      } else {
        setActiveTicket(null);
        setServiceQuantities({});
        setIsEditing(false);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Store not found. Please check the code.";
      setErrorMessage(msg);
      setStore(null);
    } finally {
      setLoadingStore(false);
    }
  };

  useEffect(() => {
    if (route.params?.qrCode) {
      setQrCodeInput(route.params.qrCode);
      fetchStore(route.params.qrCode);
    }
  }, [route.params?.qrCode]);

  const handleToggleFavorite = async () => {
    if (!store?._id) return;
    try {
      const res = await api.post("/queue/favorites/toggle", { businessId: store._id });
      setIsFavorite(Boolean(res.data?.isFavorite));
    } catch {}
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

  const handleAction = async () => {
    if (!store?._id) return;

    // State 1: Active ticket exists & not editing -> navigate to QueueStatus
    if (activeTicket && !isEditing) {
      navigation.navigate("QueueStatus", { id: activeTicket._id });
      return;
    }

    // State 2: Active ticket exists & editing -> Save Changes (Keep Spot)
    if (activeTicket && isEditing) {
      if (selectedServices.length === 0) {
        alert("Please select at least one service.");
        return;
      }
      try {
        setSubmitting(true);
        await api.put(`/queue/${activeTicket._id}/services`, { selectedServices });
        setIsEditing(false);
        navigation.navigate("QueueStatus", { id: activeTicket._id });
      } catch (err: any) {
        alert(err.response?.data?.message || "Failed to update services.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // State 3: Not in queue -> Join Queue
    if (selectedServices.length === 0) {
      alert("Please select at least one service to join the queue.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post("/queue/join", {
        businessId: store._id,
        selectedServices,
      });
      const id = res.data?._id;
      if (id) {
        navigation.navigate("QueueStatus", { id });
      }
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.activeTicket) {
        setActiveTicket(err.response.data.activeTicket);
      } else {
        alert(err.response?.data?.message || "Could not join queue.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // VIEW A: Store not loaded yet (Scan & Manual Code Entry)
  // ----------------------------------------------------
  if (!store) {
    return (
      <View style={styles.entryContainer}>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={colors.bg}
        />

        {/* Header */}
        <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ChevronBackIcon size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan & Join</Text>
        </View>

        <View style={styles.entryBody}>
          {errorMessage ? (
            <View style={styles.errorBox}>
              <AlertCard type="danger" title="Error" message={errorMessage} />
            </View>
          ) : null}

          {/* White Card: 1px #EAE8E8, radius 16, padding 16 */}
          <View style={styles.entryCard}>
            <AppButton
              title="Open Camera Scanner"
              onPress={() => setScannerOpen(true)}
              icon="camera-outline"
            />

            {/* Divider with text: "Or enter code manually" */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or enter code manually</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Input + Gradient Arrow Button */}
            <View style={styles.manualInputRow}>
              <TextInput
                style={styles.manualTextInput}
                value={qrCodeInput}
                onChangeText={setQrCodeInput}
                placeholder="Enter store QR code (e.g. STORE-123)"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => fetchStore(qrCodeInput)}
                disabled={loadingStore}
                style={styles.arrowButton}
              >
                <LinearGradient
                  colors={["#284D83", "#3E6BB2"]}
                  style={styles.arrowGradient}
                >
                  <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <QRScannerModal
          visible={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScanned={(code: string) => {
            setScannerOpen(false);
            setQrCodeInput(code);
            fetchStore(code);
          }}
          onManualEntry={() => setScannerOpen(false)}
        />
      </View>
    );
  }

  // ----------------------------------------------------
  // VIEW B: Store loaded (Detail-1 layout)
  // ----------------------------------------------------
  const shopName = store.businessProfile.shopName || "Store";
  const address = store.businessProfile.address || "Address unavailable";
  const workingHours = store.businessProfile.workingHours;
  const hoursStr = workingHours
    ? `${workingHours.openTime} - ${workingHours.closeTime}`
    : "Hours available on request";

  const isOpen = store.isOpen !== false;

  let buttonTitle = "Join Queue";
  if (activeTicket) {
    buttonTitle = isEditing ? "Save Changes (Keep Spot)" : "View Ticket Status";
  }

  return (
    <View style={styles.detailContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#284D83" />

      <ScrollView
        contentContainerStyle={[
          styles.detailScroll,
          { paddingBottom: 130 }, // clears sticky bottom action bar
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card: radius 30, diagonal navy gradient, faint Q watermark */}
        <View style={[styles.heroCard, shadows.heroCard]}>
          <LinearGradient
            colors={["#284D83", "#3E6BB2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Faint Q Watermark (8% opacity) bottom-right */}
            <View style={styles.qWatermark}>
              <LogoQ size={170} variant="monochrome" color="#FFFFFF" opacity={0.12} />
            </View>

            {/* Dark bottom overlay */}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.30)"]}
              style={styles.darkBottomOverlay}
            />

            {/* Top controls: back button (clears store) & favorite heart */}
            <View style={styles.heroTopRow}>
              <TouchableOpacity
                onPress={() => setStore(null)}
                style={styles.heroCircleButton}
              >
                <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleToggleFavorite}
                style={styles.heroCircleButton}
              >
                <HeartIcon
                  size={19}
                  color={isFavorite ? "#FC0015" : "#FFFFFF"}
                  filled={isFavorite}
                />
              </TouchableOpacity>
            </View>

            {/* Bottom info on Hero card */}
            <View style={styles.heroBottomContent}>
              <Text style={styles.heroShopName} numberOfLines={2}>
                {shopName}
              </Text>

              <View style={styles.heroTilesRow}>
                {/* Tile 1: clock / status */}
                <View style={styles.heroTileWrap}>
                  <View style={styles.heroSquareTile}>
                    <ClockIcon size={18} color="#FFFFFF" />
                  </View>
                  <Text style={styles.heroTileText} numberOfLines={1}>
                    {activeTicket
                      ? `${activeTicket.peopleAhead ?? 0} people ahead`
                      : isOpen
                      ? "Open now"
                      : "Closed"}
                  </Text>
                </View>

                {/* Tile 2: pin / address */}
                <View style={styles.heroTileWrap}>
                  <View style={styles.heroSquareTile}>
                    <PinIcon size={18} color="#FFFFFF" />
                  </View>
                  <Text style={styles.heroTileText} numberOfLines={1}>
                    {address}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Section: Store Details (18/400 black) */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeaderTitle}>Store Details</Text>

          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <PinIcon size={18} color="#525252" />
              <Text style={styles.detailText}>{address}</Text>
            </View>

            <View style={styles.detailRow}>
              <ClockIcon size={18} color="#525252" />
              <Text style={styles.detailText}>{hoursStr}</Text>
              <StatusPill
                type={isOpen ? "open" : "closed"}
                label={isOpen ? "Open" : "Closed"}
              />
            </View>
          </View>
        </View>

        {/* Active Ticket Banner (if user already in line) */}
        {activeTicket && (
          <View style={styles.activeBannerWrap}>
            <AlertCard
              type="info"
              title="You're in line"
              message={`Ticket #${activeTicket._id?.slice(-4).toUpperCase()} is currently active.`}
            />
            <View style={styles.bannerActionsRow}>
              <TouchableOpacity
                onPress={() => setIsEditing(!isEditing)}
                style={styles.editServicesBtn}
              >
                <Text style={styles.editServicesText}>
                  {isEditing ? "Cancel Edit" : "Edit Services"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Section: Services */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeaderTitle}>Services</Text>

          <View style={styles.servicesList}>
            {store.businessProfile.services?.map((svc) => {
              const qty = serviceQuantities[svc.name] || 0;
              const isSelected = qty > 0;

              return (
                <View
                  key={svc.name}
                  style={[
                    styles.serviceRow,
                    isSelected && styles.serviceRowSelected,
                  ]}
                >
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{svc.name}</Text>
                    <Text style={styles.serviceMeta}>
                      {svc.durationMin} min • ₹{svc.cost}
                    </Text>
                  </View>

                  {/* Stepper with two 28px circles */}
                  <View style={styles.stepperWrap}>
                    <TouchableOpacity
                      onPress={() => setQuantity(svc.name, -1)}
                      disabled={qty === 0}
                      style={[
                        styles.stepperCircle,
                        qty === 0 && styles.stepperCircleDisabled,
                      ]}
                    >
                      <Ionicons
                        name="remove"
                        size={16}
                        color={qty === 0 ? colors.borderLight : colors.primary}
                      />
                    </TouchableOpacity>

                    <Text style={styles.stepperCount}>{qty}</Text>

                    <TouchableOpacity
                      onPress={() => setQuantity(svc.name, 1)}
                      style={styles.stepperCircle}
                    >
                      <Ionicons name="add" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Totals Box: bg #F4F4F4, radius 12 */}
          {selectedServices.length > 0 && (
            <View style={styles.totalsBox}>
              <Text style={styles.totalsText}>
                Total Estimated Duration:{" "}
                <Text style={styles.totalsBold}>{totals.duration} mins</Text>
              </Text>
              <Text style={styles.totalsText}>
                Total Estimated Cost:{" "}
                <Text style={styles.totalsBold}>₹{totals.cost}</Text>
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar: top radius 30, upward shadow */}
      <View
        style={[
          styles.bottomActionBar,
          shadows.tabBar,
          { paddingBottom: Math.max(insets.bottom, 12) + 12 },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleAction}
          disabled={submitting}
          style={[styles.actionButtonTouch, shadows.primaryButton]}
        >
          <LinearGradient
            colors={["#284D83", "#3E6BB2"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.actionButtonGradient}
          >
            <Text style={styles.actionButtonText}>
              {submitting ? "Processing..." : buttonTitle}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    entryContainer: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: colors.bg,
    },
    backButton: {
      padding: 6,
      marginRight: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.textPrimary,
    },
    entryBody: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    errorBox: {
      marginBottom: 16,
    },
    entryCard: {
      backgroundColor: colors.card,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 20,
      gap: 12,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      fontSize: 13,
      fontFamily: typography.families.interRegular,
      color: colors.muted,
    },
    manualInputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    manualTextInput: {
      flex: 1,
      height: 48,
      borderRadius: radii.input,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      fontSize: 15,
      fontFamily: typography.families.interMedium,
      color: colors.textPrimary,
      backgroundColor: colors.cardSoft,
    },
    arrowButton: {
      width: 48,
      height: 48,
      borderRadius: radii.iconButton,
    },
    arrowGradient: {
      width: 48,
      height: 48,
      borderRadius: radii.iconButton,
      alignItems: "center",
      justifyContent: "center",
    },
    // Store Detail styles
    detailContainer: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    detailScroll: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    heroCard: {
      height: 315,
      borderRadius: radii.heroCard,
      overflow: "hidden",
      marginBottom: 24,
    },
    heroGradient: {
      flex: 1,
      padding: 20,
      justifyContent: "space-between",
      position: "relative",
    },
    qWatermark: {
      position: "absolute",
      right: -20,
      bottom: -20,
      opacity: 0.08,
    },
    darkBottomOverlay: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 120,
    },
    heroTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      zIndex: 10,
    },
    heroCircleButton: {
      width: 35,
      height: 35,
      borderRadius: 17.5,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroBottomContent: {
      zIndex: 10,
    },
    heroShopName: {
      fontSize: 24,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: "#FFFFFF",
      marginBottom: 14,
    },
    heroTilesRow: {
      flexDirection: "row",
      gap: 16,
    },
    heroTileWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    heroSquareTile: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: "rgba(255,255,255,0.20)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroTileText: {
      flex: 1,
      fontSize: 14,
      fontFamily: typography.families.interMedium,
      color: "#FFFFFF",
    },
    sectionWrap: {
      marginBottom: 24,
    },
    sectionHeaderTitle: {
      fontSize: 18,
      fontFamily: typography.families.interRegular,
      fontWeight: "400",
      color: colors.textPrimary,
      marginBottom: 12,
    },
    detailsCard: {
      backgroundColor: colors.card,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    detailText: {
      flex: 1,
      fontSize: 14,
      fontFamily: typography.families.interRegular,
      color: colors.textSecondary,
    },
    activeBannerWrap: {
      marginBottom: 24,
    },
    bannerActionsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 8,
    },
    editServicesBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardSoft,
    },
    editServicesText: {
      fontSize: 13,
      fontFamily: typography.families.interMedium,
      color: colors.primary,
    },
    servicesList: {
      gap: 10,
    },
    serviceRow: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    serviceRowSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySubtle,
    },
    serviceInfo: {
      flex: 1,
    },
    serviceName: {
      fontSize: 15,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.textPrimary,
    },
    serviceMeta: {
      fontSize: 12,
      fontFamily: typography.families.interRegular,
      color: colors.muted,
      marginTop: 4,
    },
    stepperWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    stepperCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
    stepperCircleDisabled: {
      borderColor: colors.border,
    },
    stepperCount: {
      fontSize: 15,
      fontFamily: typography.families.interSemiBold,
      color: colors.textPrimary,
      minWidth: 16,
      textAlign: "center",
    },
    totalsBox: {
      backgroundColor: colors.cardSoft,
      borderRadius: 12,
      padding: 14,
      marginTop: 12,
      gap: 6,
    },
    totalsText: {
      fontSize: 13,
      fontFamily: typography.families.interRegular,
      color: colors.textSecondary,
    },
    totalsBold: {
      fontFamily: typography.families.interSemiBold,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    bottomActionBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.cardElevated,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingTop: 20,
      paddingHorizontal: 16,
    },
    actionButtonTouch: {
      width: "100%",
      height: 52,
      borderRadius: 14,
    },
    actionButtonGradient: {
      width: "100%",
      height: "100%",
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    actionButtonText: {
      color: "#FFFFFF",
      fontSize: 17,
      fontFamily: typography.families.interSemiBold,
      fontWeight: "600",
    },
  });
}
