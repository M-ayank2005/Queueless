import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { getNotifications, markNotificationsRead } from "../../lib/api";
import { timeAgo, groupByDay, DayGroup } from "../../lib/time";
import { AppNotification } from "../../types";
import EmptyState from "../../components/EmptyState";
import { BellIcon, HourglassIcon, CheckCircleIcon } from "../../assets/icons/AppIcons";
import { useTheme } from "../../context/ThemeContext";
import { ThemeColors } from "../../theme/colors";
import { typography, radii, shadows } from "../../theme/theme";

export default function NotificationsScreen() {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const readTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchItems = async (cursor?: string) => {
    try {
      const data = await getNotifications(20, cursor);
      if (cursor) {
        setNotifications((prev) => [...prev, ...(data.items || [])]);
      } else {
        setNotifications(data.items || []);
      }
      setNextCursor(data.nextCursor || null);
      setHasMore(Boolean(data.hasMore));
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchItems();

      // On focus, mark unread items as read after 1.5s debounce
      readTimerRef.current = setTimeout(async () => {
        try {
          await markNotificationsRead();
          setNotifications((prev) =>
            prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
          );
        } catch {}
      }, 1500);

      return () => {
        if (readTimerRef.current) {
          clearTimeout(readTimerRef.current);
        }
      };
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  };

  const onEndReached = () => {
    if (!loading && hasMore && nextCursor) {
      fetchItems(nextCursor);
    }
  };

  const groups: DayGroup<AppNotification>[] = groupByDay(notifications);

  const renderCard = (item: AppNotification) => {
    const isUnread = !item.readAt;
    const timeText = timeAgo(item.createdAt);

    // Palettes by type from theme
    let cardBg = colors.alertInfoBg;
    let iconColor = colors.alertInfoIcon;
    let borderColor = colors.alertInfoBorder;

    if (item.type === "queue_updated" || item.type === "cancelled") {
      cardBg = colors.alertDangerBg;
      iconColor = colors.alertDangerIcon;
      borderColor = colors.alertDangerBorder;
    } else if (
      item.type === "joined" ||
      item.type === "your_turn" ||
      item.type === "checked_in" ||
      item.type === "completed"
    ) {
      cardBg = colors.alertSuccessBg;
      iconColor = colors.alertSuccessIcon;
      borderColor = colors.alertSuccessBorder;
    }

    const renderCardIcon = () => {
      if (item.type === "queue_updated") {
        return <HourglassIcon size={24} color={iconColor} />;
      }
      if (
        item.type === "joined" ||
        item.type === "your_turn" ||
        item.type === "checked_in" ||
        item.type === "completed"
      ) {
        return <CheckCircleIcon size={24} color={iconColor} />;
      }
      if (item.type === "cancelled") {
        return <Ionicons name="close-circle" size={24} color={iconColor} />;
      }
      return <BellIcon size={24} color={iconColor} />;
    };

    const handlePress = () => {
      if (item.queueId) {
        rootNavigation.navigate("QueueStatus", { id: item.queueId });
      }
    };

    return (
      <TouchableOpacity
        key={item._id}
        activeOpacity={item.queueId ? 0.75 : 1}
        onPress={handlePress}
        style={[
          styles.card,
          shadows.alert,
          { backgroundColor: cardBg, borderColor },
        ]}
      >
        {/* Unread indicator dot at top-right */}
        {isUnread && <View style={styles.unreadDot} />}

        {/* 24px icon */}
        <View style={styles.cardIconWrap}>{renderCardIcon()}</View>

        {/* Text content */}
        <View style={styles.cardContent}>
          {/* Title row */}
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.timeText}>{timeText}</Text>
          </View>

          {/* Body */}
          <Text style={styles.cardBody}>{item.message}</Text>

          {/* Extra row for queue_updated: Position: {n} and {m} min wait */}
          {item.type === "queue_updated" && item.meta && (
            <View style={styles.extraQueueRow}>
              {item.meta.position !== undefined && (
                <Text style={styles.posText}>
                  Position:{" "}
                  <Text style={styles.posNumber}>{item.meta.position}</Text>
                </Text>
              )}
              {item.meta.waitMin !== undefined && (
                <Text style={styles.waitText}>
                  {item.meta.waitMin} min wait
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bg}
      />

      {/* Tab-Root Header */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
        <Text style={styles.headerTitle}>Notification</Text>
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
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - 40
          ) {
            onEndReached();
          }
        }}
        scrollEventThrottle={32}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="notifications-outline"
              title="No notifications yet"
              description="We'll let you know when your queue moves."
            />
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.title} style={styles.groupContainer}>
              {/* Section label: "Today", "Yesterday", "3 days ago" */}
              <Text style={styles.groupHeading}>{group.title}</Text>

              <View style={styles.cardsList}>
                {group.data.map(renderCard)}
              </View>
            </View>
          ))
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
      paddingBottom: 14,
      backgroundColor: colors.bg,
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: typography.families.interRegular,
      fontWeight: "400",
      color: colors.textPrimary,
    },
    scrollContent: {
      flexGrow: 1,
    },
    emptyWrap: {
      paddingTop: 80,
      paddingHorizontal: 24,
    },
    groupContainer: {
      marginBottom: 24,
    },
    groupHeading: {
      fontSize: 16,
      fontFamily: typography.families.interRegular,
      fontWeight: "400",
      color: colors.textPrimary,
      paddingHorizontal: 16,
      marginBottom: 14,
    },
    cardsList: {
      paddingHorizontal: 16,
      gap: 24,
    },
    card: {
      width: "100%",
      borderRadius: radii.alert,
      padding: 16,
      borderWidth: 1,
      flexDirection: "row",
      position: "relative",
    },
    unreadDot: {
      position: "absolute",
      top: 10,
      right: 10,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    cardIconWrap: {
      width: 24,
      alignItems: "center",
      marginRight: 16,
      marginTop: 2,
    },
    cardContent: {
      flex: 1,
    },
    titleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    cardTitle: {
      flex: 1,
      fontSize: 17,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.textPrimary,
      marginRight: 8,
    },
    timeText: {
      fontSize: 13,
      fontFamily: typography.families.interRegular,
      color: colors.muted,
    },
    cardBody: {
      fontSize: 12,
      fontFamily: typography.families.interRegular,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    extraQueueRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginTop: 10,
    },
    posText: {
      fontSize: 12,
      fontFamily: typography.families.interRegular,
      color: colors.textSecondary,
    },
    posNumber: {
      fontWeight: "600",
      color: colors.textPrimary,
    },
    waitText: {
      fontSize: 12,
      fontFamily: typography.families.interSemiBold,
      fontWeight: "600",
      color: colors.dangerHelper || colors.danger,
    },
  });
}
