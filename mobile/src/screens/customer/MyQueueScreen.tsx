import React, { useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../navigation/types";
import { api } from "../../lib/api";
import { QueueEntry } from "../../types";
import EmptyState from "../../components/EmptyState";
import { useTheme } from "../../context/ThemeContext";
import { ThemeColors } from "../../theme/colors";
import { typography } from "../../theme/theme";

export default function MyQueueScreen() {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeQueues, setActiveQueues] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQueues = async () => {
    try {
      const res = await api.get("/queue/my-queues");
      setActiveQueues(res.data || []);
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchQueues();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchQueues();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bg}
      />

      {/* Tab Root Header: "My Queue" (no back arrow) */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
        <Text style={styles.headerTitle}>My Queue</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeQueues.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="time-outline"
              title="No Active Queues"
              description="You have not joined any virtual queue yet. Scan a store QR code to reserve your spot."
              actionLabel="Scan QR Code"
              onAction={() => rootNavigation.navigate("ScanJoin")}
            />
          </View>
        ) : (
          activeQueues.map((item) => {
            const shopName =
              item.businessId?.businessProfile?.shopName ||
              item.businessId?.name ||
              "Store Queue";
            const initial = shopName.charAt(0).toUpperCase();
            const peopleAhead = item.peopleAhead ?? 0;
            const waitMin = item.currentEstimatedWait ?? 0;
            const isVerified = Boolean(item.verifiedAt);
            const isServing = item.status === "in_progress";

            let statusLabel = "Waiting for Check-In";
            let statusColor = colors.danger;

            if (isServing) {
              statusLabel = "Now Serving";
              statusColor = colors.success;
            } else if (isVerified) {
              statusLabel = "Checked-In";
              statusColor = colors.success;
            }

            return (
              <React.Fragment key={item._id}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => rootNavigation.navigate("QueueStatus", { id: item._id })}
                  style={styles.rowItem}
                >
                  {/* 76x56 tile */}
                  <View style={styles.tile}>
                    <Text style={styles.tileLetter}>{initial}</Text>
                  </View>

                  {/* Middle Text Content */}
                  <View style={styles.infoCol}>
                    <Text style={styles.shopName} numberOfLines={1}>
                      {shopName}
                    </Text>
                    <Text style={styles.microLine}>
                      {peopleAhead} People Ahead{"   "}
                      {waitMin} min wait
                    </Text>
                    <Text style={styles.statusLine}>
                      Status:{" "}
                      <Text style={[styles.statusValue, { color: statusColor }]}>
                        {statusLabel}
                      </Text>
                    </Text>
                  </View>

                  {/* Chevron Right */}
                  <View style={styles.chevronWrap}>
                    <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                  </View>
                </TouchableOpacity>

                {/* 1px divider */}
                <View style={styles.divider} />
              </React.Fragment>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    headerRow: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: colors.bg,
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.textPrimary,
    },
    scrollContent: {
      flexGrow: 1,
    },
    emptyWrap: {
      paddingTop: 60,
      paddingHorizontal: 24,
    },
    rowItem: {
      height: 106,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      backgroundColor: colors.bg,
    },
    tile: {
      width: 76,
      height: 56,
      borderRadius: 6,
      backgroundColor: colors.primarySubtle,
      alignItems: "center",
      justifyContent: "center",
    },
    tileLetter: {
      fontSize: 24,
      fontFamily: typography.families.interSemiBold,
      fontWeight: "600",
      color: colors.primary,
    },
    infoCol: {
      flex: 1,
      marginLeft: 13,
      justifyContent: "center",
    },
    shopName: {
      fontSize: 20,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    microLine: {
      fontSize: 11,
      fontFamily: typography.families.interRegular,
      color: colors.muted,
      marginTop: 4,
    },
    statusLine: {
      fontSize: 11,
      fontFamily: typography.families.interRegular,
      color: colors.textSecondary,
      marginTop: 3,
    },
    statusValue: {
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
    },
    chevronWrap: {
      paddingLeft: 8,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      width: "100%",
    },
  });
}
