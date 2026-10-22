import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ScrollView,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenHeader from "../../components/ScreenHeader";
import AppLoader from "../../components/AppLoader";
import EmptyState from "../../components/EmptyState";
import ListRow from "../../components/ListRow";
import { api } from "../../lib/api";
import { RootStackParamList } from "../../navigation/types";
import { QueueEntry } from "../../types";
import { useTheme } from "../../context/ThemeContext";
import { ThemeColors } from "../../theme/colors";
import { typography, radii } from "../../theme/theme";

export default function BookingHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [history, setHistory] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadHistory = async () => {
    try {
      const res = await api.get("/queue/history");
      setHistory(res.data || []);
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadHistory();
      setLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase().trim();
    return history.filter((entry) => {
      const shopName = (
        entry.businessId?.businessProfile?.shopName ||
        entry.businessId?.name ||
        ""
      ).toLowerCase();
      const ticketId = (entry._id || "").toLowerCase();
      const ticketSuffix = (entry._id || "").slice(-4).toLowerCase();
      const services = (entry.selectedServices || [])
        .map((s) => s.name.toLowerCase())
        .join(" ");

      return (
        shopName.includes(q) ||
        ticketId.includes(q) ||
        ticketSuffix.includes(q) ||
        services.includes(q)
      );
    });
  }, [history, searchQuery]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        <AppLoader
          message="Loading booking history..."
          submessage="Retrieving your past visits and tickets"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bg}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16) + 12,
            paddingBottom: Math.max(insets.bottom, 16) + 32,
          },
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
        <ScreenHeader title="Booking History" showBack={navigation.canGoBack()} />

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by store or service..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* List of Visits */}
        <View style={styles.listContainer}>
          {filteredHistory.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title={searchQuery ? "No Matching Visits" : "No Past Visits Yet"}
              description={
                searchQuery
                  ? "Try searching for a different store name or service."
                  : "Your completed and cancelled tickets will appear here."
              }
            />
          ) : (
            filteredHistory.map((ticket) => {
              const shopName =
                ticket.businessId?.businessProfile?.shopName ||
                ticket.businessId?.name ||
                "Past Visit";
              const dateStr = ticket.date
                ? new Date(ticket.date).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                  })
                : "";
              const ticketNum = ticket._id ? ticket._id.slice(-4).toUpperCase() : "";

              return (
                <ListRow
                  key={ticket._id}
                  title={shopName}
                  subtitleGrey={`${dateStr} • #${ticketNum}`}
                  statusPill={{ status: ticket.status }}
                  onPress={() => navigation.navigate("QueueStatus", { id: ticket._id })}
                />
              );
            })
          )}
        </View>
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
    scrollContent: {
      paddingHorizontal: 16,
      gap: 16,
    },
    searchBar: {
      height: 48,
      borderRadius: radii.search,
      backgroundColor: colors.cardSoft,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      fontFamily: typography.families.interRegular,
      color: colors.textPrimary,
    },
    listContainer: {
      width: "100%",
    },
  });
}
