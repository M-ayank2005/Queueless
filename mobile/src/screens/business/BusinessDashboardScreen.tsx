import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import AppLoader from "../../components/AppLoader";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import SectionHeader from "../../components/SectionHeader";
import StatusBadge from "../../components/StatusBadge";
import { api } from "../../lib/api";
import { BusinessTabParamList } from "../../navigation/types";
import { QueueEntry, ServiceItem } from "../../types";
import { colors } from "../../theme/colors";
import { radii, shadows, spacing, typography } from "../../theme/theme";

type BusinessProfileResponse = {
  shopName: string;
  address: string;
  uniqueQrCode: string;
  services: ServiceItem[];
};

type Props = BottomTabScreenProps<BusinessTabParamList, "Dashboard">;

export default function BusinessDashboardScreen(_: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<BusinessProfileResponse | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [cost, setCost] = useState("");
  const [copied, setCopied] = useState(false);
  const [addingService, setAddingService] = useState(false);

  const copyToClipboard = async () => {
    if (!profile?.uniqueQrCode) return;
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(profile.uniqueQrCode);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      const [profileRes, queueRes] = await Promise.all([
        api.get("/business/me"),
        api.get("/business/queue"),
      ]);
      setProfile(profileRes.data);
      setQueue(queueRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const [profileRes, queueRes] = await Promise.all([
        api.get("/business/me"),
        api.get("/business/queue"),
      ]);
      setProfile(profileRes.data);
      setQueue(queueRes.data || []);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeQueue = useMemo(
    () => queue.filter((item) => item.status === "waiting" || item.status === "in_progress"),
    [queue]
  );

  const processedQueue = useMemo(
    () =>
      queue
        .filter((item) => item.status === "completed" || item.status === "cancelled")
        .sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.joinedAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.joinedAt || 0).getTime();
          return timeB - timeA;
        })
        .slice(0, 10),
    [queue]
  );

  const addService = async () => {
    if (!profile || !serviceName || !durationMin || !cost) {
      const msg = "Please enter service name, duration in minutes, and cost.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Missing details", msg);
      return;
    }

    const updated = [
      ...(profile.services || []),
      { name: serviceName.trim(), durationMin: Number(durationMin), cost: Number(cost) },
    ];

    try {
      setAddingService(true);
      const response = await api.put("/business/services", { services: updated });
      setProfile((prev) => (prev ? { ...prev, services: response.data.services } : prev));
      setServiceName("");
      setDurationMin("");
      setCost("");
    } catch {
      const msg = "Could not update services. Please try again.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Unable to save", msg);
    } finally {
      setAddingService(false);
    }
  };

  const confirmRemoveService = (index: number, name: string) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Are you sure you want to remove "${name}"?`)) {
        removeService(index);
      }
    } else {
      Alert.alert(
        "Remove Service",
        `Are you sure you want to delete "${name}" from your service catalog?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: () => removeService(index) },
        ]
      );
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
      const msg = "Could not remove service.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Unable to remove", msg);
    }
  };

  const updateStatus = async (id: string, status: "completed" | "cancelled" | "in_progress") => {
    try {
      await api.put(`/business/queue/${id}/status`, { status });
      await load();
    } catch {
      const msg = "Status update failed. Please retry.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Error", msg);
    }
  };

  if (loading) {
    return (
      <AppScreen scroll={false}>
        <AppLoader
          message="Loading store dashboard..."
          submessage="Retrieving live queue and catalog"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      hasTabBar
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Store Header Row */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.storeIconWrap}>
            <Ionicons name="storefront" size={22} color={colors.primary} />
          </View>
          <View style={styles.flex1}>
            <View style={styles.shopNameRow}>
              <Text style={styles.title} numberOfLines={1}>
                {profile?.shopName || "Business Dashboard"}
              </Text>
              <StatusBadge status="open" size="sm" />
            </View>
            <Text style={styles.subtitle} numberOfLines={1}>
              📍 {profile?.address || "Store location"}
            </Text>
          </View>
        </View>
      </View>

      {/* Store QR Code Check-in Card */}
      <Card variant="elevated" style={styles.qrCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleWrap}>
            <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Store Check-In QR</Text>
          </View>
          <StatusBadge status="open" label="SCAN READY" pulse size="sm" />
        </View>

        {profile?.uniqueQrCode ? (
          <View style={styles.qrCenterWrap}>
            <View style={styles.qrWhiteBox}>
              <Image
                source={{
                  uri: `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(
                    profile.uniqueQrCode
                  )}`,
                }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.codeSnippetBox}>
              <View style={styles.codeTextCol}>
                <Text style={styles.codeLabel}>STORE QR IDENTIFIER</Text>
                <Text style={styles.codeString} numberOfLines={1}>
                  {profile.uniqueQrCode}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.copyBtn, copied && styles.copyBtnActive]}
                onPress={copyToClipboard}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={copied ? "checkmark-circle" : "copy-outline"}
                  size={15}
                  color={copied ? colors.success : colors.primary}
                />
                <Text style={[styles.copyBtnText, copied && styles.copiedText]}>
                  {copied ? "Copied!" : "Copy"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.qrHelpText}>
              Display this QR code at your checkout desk. Customers scan it with their phone to join line without crowding.
            </Text>
          </View>
        ) : null}
      </Card>

      {/* Live Queue Section */}
      <View style={styles.sectionWrap}>
        <SectionHeader
          title="Live Queue"
          subtitle="Customers currently waiting or being served"
          icon="people-outline"
          count={activeQueue.length}
          actionIcon="refresh-outline"
          actionText="Refresh"
          onActionPress={onRefresh}
          actionLoading={refreshing}
        />

        {activeQueue.length === 0 ? (
          <EmptyState
            icon="checkmark-circle-outline"
            iconColor={colors.success}
            title="All Caught Up!"
            description="There are no customers currently waiting in line. New check-ins will appear here immediately."
          />
        ) : (
          <View style={styles.queueList}>
            {activeQueue.map((item, index) => {
              const wait = item.currentEstimatedWait ?? 0;
              const isServing = item.status === "in_progress";

              return (
                <Card key={item._id} variant="elevated" style={styles.queueItemCard}>
                  <View style={styles.queueItemHeader}>
                    <View style={styles.positionBadge}>
                      <Text style={styles.positionText}>#{index + 1}</Text>
                    </View>

                    <View style={styles.queueItemInfo}>
                      <Text style={styles.customerName} numberOfLines={1}>
                        {item.customerId?.name || "Customer Ticket"}
                      </Text>
                      <Text style={styles.ticketPill}>
                        Ticket #{item._id.slice(-4).toUpperCase()}
                      </Text>
                    </View>

                    <StatusBadge status={item.status} size="sm" />
                  </View>

                  {/* Services summary */}
                  {item.selectedServices?.length ? (
                    <View style={styles.itemServicesRow}>
                      {item.selectedServices.map((s, idx) => (
                        <View key={`${s.name}_${idx}`} style={styles.serviceChip}>
                          <Text style={styles.serviceChipText}>
                            {s.name} (${s.cost})
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {/* Action buttons row */}
                  <View style={styles.itemActionRow}>
                    <TouchableOpacity
                      style={styles.doneBtn}
                      onPress={() => updateStatus(item._id, "completed")}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-done" size={15} color="#FFF" />
                      <Text style={styles.doneBtnText}>Mark Completed</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => updateStatus(item._id, "cancelled")}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={15} color={colors.danger} />
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </View>

      {/* Processed Customers Section */}
      <View style={styles.sectionWrap}>
        <SectionHeader
          title="Processed Customers"
          subtitle="Recently served or resolved customers (max 10)"
          icon="checkmark-done-circle-outline"
          iconColor={colors.success}
          count={processedQueue.length}
        />

        {processedQueue.length === 0 ? (
          <EmptyState
            icon="time-outline"
            iconColor={colors.muted}
            title="No Processed Customers Yet"
            description="Customers whose service is completed or cancelled will appear here."
          />
        ) : (
          <View style={styles.queueList}>
            {processedQueue.map((item) => {
              const processedTimestamp = item.updatedAt || item.joinedAt;
              const processedTimeStr = processedTimestamp
                ? new Date(processedTimestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              return (
                <Card key={item._id} variant="subtle" style={styles.processedItemCard}>
                  <View style={styles.processedItemHeader}>
                    <View style={styles.processedItemInfo}>
                      <View style={styles.processedNameRow}>
                        <Text style={styles.customerName} numberOfLines={1}>
                          {item.customerId?.name || item.customerName || "Customer"}
                        </Text>
                        <StatusBadge status={item.status} size="sm" />
                      </View>
                      <View style={styles.processedMetaRow}>
                        <Text style={styles.ticketPill}>
                          Ticket #{item._id.slice(-4).toUpperCase()}
                        </Text>
                        {processedTimeStr ? (
                          <>
                            <Text style={styles.dotSeparator}>•</Text>
                            <View style={styles.processedTimeBox}>
                              <Ionicons name="time-outline" size={12} color={colors.muted} />
                              <Text style={styles.processedTimeText}>{processedTimeStr}</Text>
                            </View>
                          </>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  {/* Services summary if any */}
                  {item.selectedServices?.length ? (
                    <View style={styles.itemServicesRow}>
                      {item.selectedServices.map((s, idx) => (
                        <View key={`${s.name}_${idx}`} style={styles.serviceChip}>
                          <Text style={styles.serviceChipText}>
                            {s.name} (${s.cost})
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
        )}
      </View>

      {/* Store Services Catalog Section */}
      <View style={styles.sectionWrap}>
        <SectionHeader
          title="Store Services"
          subtitle="Configure services and prices available for queue booking"
          icon="pricetag-outline"
          count={profile?.services?.length || 0}
        />

        {/* Services List */}
        <View style={styles.servicesGrid}>
          {profile?.services?.map((service, index) => (
            <Card key={`${service.name}_${index}`} variant="subtle" style={styles.serviceCard}>
              <View style={styles.serviceCardLeft}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <View style={styles.serviceMetaRow}>
                  <Text style={styles.serviceDuration}>⏱ {service.durationMin} mins</Text>
                  <Text style={styles.dotSeparator}>•</Text>
                  <Text style={styles.serviceCost}>${service.cost}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => confirmRemoveService(index, service.name)}
                style={styles.trashBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </Card>
          ))}
        </View>

        {/* Add New Service Form Card */}
        <Card variant="elevated" style={styles.addServiceCard}>
          <Text style={styles.addServiceTitle}>Add New Service</Text>

          <AppInput
            label="Service Name"
            value={serviceName}
            onChangeText={setServiceName}
            placeholder="e.g. Haircut & Wash, Screen Replacement"
            icon="create-outline"
          />

          <View style={styles.inputTwoCol}>
            <View style={styles.flex1}>
              <AppInput
                label="Duration (mins)"
                value={durationMin}
                onChangeText={setDurationMin}
                keyboardType="numeric"
                placeholder="e.g. 25"
                icon="time-outline"
              />
            </View>
            <View style={styles.flex1}>
              <AppInput
                label="Cost ($)"
                value={cost}
                onChangeText={setCost}
                keyboardType="numeric"
                placeholder="e.g. 20"
                icon="cash-outline"
              />
            </View>
          </View>

          <AppButton
            title="Add Service to Catalog"
            onPress={addService}
            loading={addingService}
            loadingText="Adding Service..."
            icon="add-circle-outline"
            style={{ marginTop: spacing.xs }}
          />
        </Card>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: spacing.xs,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  storeIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  shopNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
    flex: 1,
    minWidth: 0,
    marginRight: spacing.xs,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  qrCard: {
    gap: spacing.lg,
    padding: spacing.xl,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  qrCenterWrap: {
    alignItems: "center",
    gap: spacing.md,
  },
  qrWhiteBox: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: radii.lg,
    ...shadows.card,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  codeSnippetBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: "100%",
  },
  codeTextCol: {
    flex: 1,
    gap: 2,
    marginRight: spacing.sm,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 0.8,
  },
  codeString: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderLight,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    flexShrink: 0,
  },
  copyBtnActive: {
    backgroundColor: colors.successSubtle,
    borderColor: colors.successBorder,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  copiedText: {
    color: colors.success,
  },
  qrHelpText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
  sectionWrap: {
    gap: spacing.md,
  },
  queueList: {
    gap: spacing.md,
  },
  queueItemCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  queueItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  positionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  positionText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.primary,
  },
  queueItemInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    marginRight: spacing.xs,
  },
  customerName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  ticketPill: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  itemServicesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  serviceChip: {
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  serviceChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  itemActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: 2,
  },
  doneBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.success,
    paddingVertical: 9,
    borderRadius: radii.md,
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.dangerSubtle,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.md,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.danger,
  },
  servicesGrid: {
    gap: spacing.sm,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  serviceCardLeft: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    marginRight: spacing.sm,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    flexWrap: "wrap",
  },
  serviceMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  serviceDuration: {
    fontSize: 12,
    color: colors.muted,
  },
  dotSeparator: {
    color: colors.mutedDark,
  },
  serviceCost: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.successLight,
  },
  trashBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dangerSubtle,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  addServiceCard: {
    gap: spacing.md,
    padding: spacing.xl,
  },
  addServiceTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.1,
  },
  inputTwoCol: {
    flexDirection: "row",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  flex1: {
    flex: 1,
    minWidth: 120,
  },
  processedItemCard: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
  },
  processedItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  processedItemInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  processedNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  processedMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  processedTimeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  processedTimeText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600",
  },
});

