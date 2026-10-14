import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../components/AppButton";
import AppLoader from "../../components/AppLoader";
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

/**
 * BusinessDashboardScreen
 * Command center for business owners:
 * - Displays store details and QR code for in-store scanning
 * - Real-time queue management (mark completed / cancel)
 * - Service catalog management (CRUD operations on services)
 */
export default function BusinessDashboardScreen(_: Props) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<BusinessProfileResponse | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [cost, setCost] = useState("");
  const [copied, setCopied] = useState(false);
  const [addingService, setAddingService] = useState(false);

  // Platform-adaptive clipboard copy for store QR identifier (web vs native)
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

  /**
   * Parallel network requests via Promise.all:
   * Fetches business profile and live queue concurrently to reduce time-to-interactive.
   */
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

  useEffect(() => {
    load();
  }, []);

  /**
   * Memoized active queue list:
   * Prevents recalculating the filtered queue on unrelated re-renders (e.g. typing in form inputs).
   */
  const activeQueue = useMemo(
    () => queue.filter((item) => item.status === "waiting" || item.status === "in_progress"),
    [queue]
  );

  /**
   * Adds a new service to the store catalog using immutable array expansion.
   */
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

  /**
   * Deletes a service by index using an immutable copy of the array
   * and synchronizes with the backend database.
   */
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

  /**
   * Transitions a customer's queue ticket to 'completed' or 'cancelled',
   * then re-fetches the active queue state.
   */
  const updateStatus = async (id: string, status: "completed" | "cancelled") => {
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
          submessage="Retrieving active queue and store catalog"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      {/* Store Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.storeIconWrap}>
            <Ionicons name="storefront" size={20} color={colors.primary} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.title}>{profile?.shopName || "Business Dashboard"}</Text>
            <Text style={styles.subtitle}>{profile?.address || "Store location"}</Text>
          </View>
        </View>
      </View>

      {/* Store QR Code Card */}
      <Card style={styles.qrCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleWrap}>
            <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Store Check-In QR</Text>
          </View>
          <View style={styles.activePill}>
            <View style={styles.liveDot} />
            <Text style={styles.activePillText}>SCAN READY</Text>
          </View>
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
                  color={copied ? "#10B981" : colors.primary}
                />
                <Text style={[styles.copyBtnText, copied && styles.copiedText]}>
                  {copied ? "Copied" : "Copy"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.qrHelpText}>
              Display this QR code at your store desk or entrance. Customers scan it with their phone to take a live queue ticket.
            </Text>
          </View>
        ) : (
          <Text style={styles.meta}>No QR Code generated yet.</Text>
        )}
      </Card>

      {/* Live Queue Management Card */}
      <Card style={styles.queueCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleWrap}>
            <Ionicons name="people-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Live Queue ({activeQueue.length})</Text>
          </View>
          <TouchableOpacity onPress={load} activeOpacity={0.7} style={styles.refreshBtn}>
            <Ionicons name="refresh-outline" size={16} color={colors.muted} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {activeQueue.length === 0 ? (
          <View style={styles.emptyQueueBox}>
            <Ionicons name="checkmark-done-circle-outline" size={32} color="#10B981" />
            <Text style={styles.emptyQueueTitle}>All Caught Up!</Text>
            <Text style={styles.emptyQueueText}>
              There are no customers currently waiting in line.
            </Text>
          </View>
        ) : (
          activeQueue.map((item) => (
            <View key={item._id} style={styles.queueItemCard}>
              <View style={styles.queueItemTop}>
                <View style={styles.flex1}>
                  <Text style={styles.customerName}>
                    {item.customerId?.name || item.customerId || "Customer"}
                  </Text>
                  <Text style={styles.ticketPill}>
                    Ticket #{item._id.slice(-4).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusBadgeText}>WAITING</Text>
                </View>
              </View>

              {item.selectedServices?.length ? (
                <View style={styles.servicesTagRow}>
                  {item.selectedServices.map((service, sIdx) => (
                    <View key={sIdx} style={styles.serviceTag}>
                      <Text style={styles.serviceTagText}>
                        {service.name} (${service.cost})
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.itemActionRow}>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => updateStatus(item._id, "completed")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
                  <Text style={styles.doneBtnText}>Serve / Done</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => updateStatus(item._id, "cancelled")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </Card>

      {/* Services Catalog & Creation Card */}
      <Card style={styles.serviceCatalogCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleWrap}>
            <Ionicons name="pricetags-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>
              Store Services ({profile?.services?.length || 0})
            </Text>
          </View>
        </View>

        {(profile?.services || []).length === 0 ? (
          <Text style={styles.meta}>No services configured yet. Add your first service below.</Text>
        ) : (
          (profile?.services || []).map((service, index) => (
            <View key={`${service.name}_${index}`} style={styles.serviceRow}>
              <View style={styles.flex1}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceMeta}>
                  ⏱ {service.durationMin} mins • ${service.cost}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => removeService(index)}
                style={styles.deleteIconBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Add Service Section with Clean Inputs */}
        <View style={styles.addServiceContainer}>
          <Text style={styles.addServiceTitle}>Add New Service</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Service Name</Text>
            <TextInput
              style={styles.textInputField}
              placeholder="e.g. Haircut & Wash, Screen Replacement"
              placeholderTextColor={colors.muted}
              value={serviceName}
              onChangeText={setServiceName}
            />
          </View>

          <View style={styles.twoColInputs}>
            <View style={styles.flex1}>
              <Text style={styles.inputLabel}>Duration (mins)</Text>
              <TextInput
                style={styles.textInputField}
                placeholder="e.g. 25"
                placeholderTextColor={colors.muted}
                value={durationMin}
                onChangeText={setDurationMin}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.inputLabel}>Cost ($)</Text>
              <TextInput
                style={styles.textInputField}
                placeholder="e.g. 20"
                placeholderTextColor={colors.muted}
                value={cost}
                onChangeText={setCost}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.addBtnWrap}>
            <AppButton
              title="Add Service"
              onPress={addService}
              loading={addingService}
              icon="add-circle-outline"
            />
          </View>
        </View>
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loading: {
    color: colors.muted,
    fontSize: 15,
  },
  header: {
    paddingTop: 6,
    gap: 4,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  storeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  flex1: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 17,
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  activePillText: {
    color: "#34D399",
    fontSize: 10,
    fontWeight: "800",
  },
  qrCard: {
    gap: 16,
    paddingVertical: 18,
  },
  qrCenterWrap: {
    alignItems: "center",
    gap: 14,
  },
  qrWhiteBox: {
    width: 220,
    height: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  qrImage: {
    width: "100%",
    height: "100%",
  },
  codeSnippetBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: "100%",
    gap: 8,
  },
  codeTextCol: {
    flex: 1,
  },
  codeLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  codeString: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(59, 130, 246, 0.14)",
    borderColor: "rgba(59, 130, 246, 0.3)",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  copyBtnActive: {
    backgroundColor: "rgba(16, 185, 129, 0.14)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  copyBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  copiedText: {
    color: "#10B981",
  },
  qrHelpText: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  queueCard: {
    gap: 14,
    paddingVertical: 18,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  refreshText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyQueueBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 6,
  },
  emptyQueueTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  emptyQueueText: {
    color: colors.muted,
    fontSize: 13,
  },
  queueItemCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    backgroundColor: colors.cardSoft,
    gap: 10,
  },
  queueItemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  customerName: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 16,
  },
  ticketPill: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  statusBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
  },
  servicesTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  serviceTag: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  serviceTagText: {
    color: colors.muted,
    fontSize: 12,
  },
  itemActionRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  doneBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.35)",
    borderWidth: 1,
    paddingVertical: 9,
    borderRadius: 10,
  },
  doneBtnText: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "700",
  },
  cancelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderWidth: 1,
    paddingVertical: 9,
    borderRadius: 10,
  },
  cancelBtnText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "700",
  },
  serviceCatalogCard: {
    gap: 14,
    paddingVertical: 18,
  },
  serviceRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: colors.cardSoft,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceName: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  serviceMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  deleteIconBtn: {
    padding: 6,
  },
  addServiceContainer: {
    marginTop: 8,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  addServiceTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  textInputField: {
    width: "100%",
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  twoColInputs: {
    flexDirection: "row",
    gap: 12,
  },
  addBtnWrap: {
    marginTop: 4,
  },
});
