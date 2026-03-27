import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AppButton from "../../components/AppButton";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import { api } from "../../lib/api";
import { CustomerTabParamList, RootStackParamList } from "../../navigation/types";
import { QueueEntry } from "../../types";
import { colors } from "../../theme/colors";

type Props = BottomTabScreenProps<CustomerTabParamList, "Home">;

export default function CustomerHomeScreen({ navigation }: Props) {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [activeQueues, setActiveQueues] = useState<QueueEntry[]>([]);
  const [history, setHistory] = useState<QueueEntry[]>([]);

  const fetchData = async () => {
    const [activeRes, historyRes] = await Promise.all([
      api.get("/queue/my-queues"),
      api.get("/queue/history"),
    ]);
    setActiveQueues(activeRes.data || []);
    setHistory(historyRes.data || []);
  };

  const load = async () => {
    try {
      setLoading(true);
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    try {
      setRefreshing(true);
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  if (loading) {
    return (
      <AppScreen scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Loading queues...</Text>
        </View>
      </AppScreen>
    );
  }

  const entries = tab === "active" ? activeQueues : history;

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>My Queues</Text>
        <AppButton title="Scan & Join" onPress={() => navigation.navigate("ScanJoin")} />
      </View>

      <View style={styles.tabs}>
        <Pressable onPress={() => setTab("active")} style={[styles.tabBtn, tab === "active" && styles.tabActive]}>
          <Text style={[styles.tabText, tab === "active" && styles.tabTextActive]}>Active ({activeQueues.length})</Text>
        </Pressable>
        <Pressable onPress={() => setTab("history")} style={[styles.tabBtn, tab === "history" && styles.tabActive]}>
          <Text style={[styles.tabText, tab === "history" && styles.tabTextActive]}>History</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {entries.length === 0 ? (
          <Card>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>
              {tab === "active" ? "You are not in an active queue." : "No completed or cancelled queue entries yet."}
            </Text>
          </Card>
        ) : (
          entries.map((entry) => {
            const shopName =
              entry.businessId?.businessProfile?.shopName || entry.businessId?.shopName || "QueueLess Store";
            const wait = entry.currentEstimatedWait ?? 0;
            const ahead = entry.peopleAhead ?? 0;

            return (
              <Pressable
                key={entry._id}
                onPress={() => rootNavigation.navigate("QueueStatus", { id: entry._id })}
                style={styles.row}
              >
                <Card>
                  <Text style={styles.shopName}>{shopName}</Text>
                  <Text style={styles.muted}>
                    Ticket #{entry._id.slice(-4).toUpperCase()} • {entry.status}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{ahead} ahead</Text>
                    <Text style={styles.metaText}>~{wait} mins</Text>
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  header: {
    gap: 12,
    paddingTop: 6,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  tabs: {
    flexDirection: "row",
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardSoft,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(59,130,246,0.22)",
  },
  tabText: {
    color: colors.muted,
    fontWeight: "700",
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.text,
  },
  list: {
    gap: 10,
    paddingBottom: 20,
  },
  row: {
    borderRadius: 16,
  },
  shopName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaText: {
    color: colors.primary,
    fontWeight: "700",
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
  },
});
