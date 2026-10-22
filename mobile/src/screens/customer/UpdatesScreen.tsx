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
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getUpdates } from "../../lib/api";
import { timeAgo, groupByDay, DayGroup } from "../../lib/time";
import { AppUpdate, UpdateType } from "../../types";
import { Chip } from "../../components/Chip";
import EmptyState from "../../components/EmptyState";
import { OfferBadgeIcon } from "../../assets/icons/AppIcons";
import { useTheme } from "../../context/ThemeContext";
import { ThemeColors } from "../../theme/colors";
import { typography, radii, shadows } from "../../theme/theme";

export default function UpdatesScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeFilter, setActiveFilter] = useState<"all" | UpdateType>("all");
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchItems = async (filterType = activeFilter, cursor?: string) => {
    try {
      const typeParam = filterType === "all" ? undefined : filterType;
      const data = await getUpdates(typeParam, 20, cursor);
      if (cursor) {
        setUpdates((prev) => [...prev, ...(data.items || [])]);
      } else {
        setUpdates(data.items || []);
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
      fetchItems(activeFilter);
    }, [activeFilter])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItems(activeFilter);
    setRefreshing(false);
  };

  const onEndReached = () => {
    if (!loading && hasMore && nextCursor) {
      fetchItems(activeFilter, nextCursor);
    }
  };

  const handleFilterChange = (newFilter: "all" | UpdateType) => {
    setActiveFilter(newFilter);
    setLoading(true);
    fetchItems(newFilter);
  };

  const groups: DayGroup<AppUpdate>[] = groupByDay(updates);

  const renderCard = (item: AppUpdate) => {
    const timeText = timeAgo(item.createdAt);

    let cardBg = colors.alertInfoBg;
    let cardBorder = colors.alertInfoBorder;
    let iconColor = colors.alertInfoIcon;

    if (item.type === "alert") {
      cardBg = colors.alertDangerBg;
      cardBorder = colors.alertDangerBorder;
      iconColor = colors.alertDangerIcon;
    } else if (item.type === "offer") {
      cardBg = colors.alertOfferBg;
      cardBorder = colors.alertOfferBorder;
      iconColor = colors.alertOfferIcon;
    }

    const renderIcon = () => {
      if (item.type === "alert") {
        return <Ionicons name="warning-outline" size={24} color={iconColor} />;
      }
      if (item.type === "offer") {
        return <OfferBadgeIcon size={24} color={iconColor} />;
      }
      return <Ionicons name="information-circle-outline" size={24} color={iconColor} />;
    };

    return (
      <View
        key={item._id}
        style={[
          styles.card,
          shadows.alert,
          { backgroundColor: cardBg, borderColor: cardBorder },
        ]}
      >
        <View style={styles.cardIconWrap}>{renderIcon()}</View>

        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.timeText}>{timeText}</Text>
          </View>

          {item.shopName ? (
            <Text style={styles.businessName}>
              {item.shopName}
            </Text>
          ) : null}

          <Text style={styles.cardMessage}>{item.message}</Text>

          {item.validTill && (
            <Text style={styles.validTillText}>
              Valid till:{" "}
              {new Date(item.validTill).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bg}
      />

      {/* Tab-Root Header: "Updates" */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
        <Text style={styles.headerTitle}>Updates</Text>
      </View>

      {/* Filter Chips: [All, Info, Offers, Alerts] */}
      <View style={styles.chipRow}>
        <Chip
          label="All"
          active={activeFilter === "all"}
          onPress={() => handleFilterChange("all")}
        />
        <Chip
          label="Info"
          active={activeFilter === "info"}
          onPress={() => handleFilterChange("info")}
        />
        <Chip
          label="Offers"
          active={activeFilter === "offer"}
          onPress={() => handleFilterChange("offer")}
        />
        <Chip
          label="Alerts"
          active={activeFilter === "alert"}
          onPress={() => handleFilterChange("alert")}
        />
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
        {updates.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="megaphone-outline"
              title="No updates yet"
              description="Updates from your saved stores and recent visits will show up here."
            />
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.title} style={styles.groupContainer}>
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
    chipRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 16,
      marginBottom: 20,
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
      gap: 20,
    },
    card: {
      width: "100%",
      borderRadius: radii.alert,
      padding: 16,
      borderWidth: 1,
      flexDirection: "row",
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
      marginBottom: 4,
    },
    cardTitle: {
      flex: 1,
      fontSize: 18,
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
    businessName: {
      fontSize: 13,
      fontFamily: typography.families.interSemiBold,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 4,
    },
    cardMessage: {
      fontSize: 13,
      fontFamily: typography.families.interRegular,
      color: colors.textSecondary,
      lineHeight: 19,
    },
    validTillText: {
      marginTop: 6,
      fontSize: 13,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.textPrimary,
    },
  });
}
