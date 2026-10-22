import React, { useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../context/ThemeContext";
import { ThemeColors } from "../../theme/colors";
import { typography, radii, shadows } from "../../theme/theme";
import { ONBOARDING_SEEN_KEY } from "./SplashScreen";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    image: require("../../assets/illustrations/onboarding-1.png"),
    heading: "Waiting in long queues?",
    subtitle: "Standing in line wastes time and feels frustrating.",
  },
  {
    id: "2",
    image: require("../../assets/illustrations/onboarding-2.png"),
    heading: "Join from home",
    subtitle: "Book your spot digitally while you relax—no need to stand in line.",
  },
  {
    id: "3",
    image: require("../../assets/illustrations/onboarding-3.png"),
    heading: "Arrive on time",
    subtitle: "Get notified when it's your turn and walk in without waiting.",
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < SLIDES.length) {
      setActiveIndex(index);
    }
  };

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, "true");
    } catch {}
    navigation.replace("Login");
  };

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => {
    return (
      <View style={styles.slide}>
        {/* Brand title at top */}
        <Text style={styles.brandTitle}>
          Queue<Text style={styles.brandTitleLess}>Less</Text>
        </Text>

        {/* Illustration area */}
        <View style={styles.illustrationWrap}>
          <Image
            source={item.image}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        {/* Heading */}
        <Text style={styles.heading}>{item.heading}</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={[colors.pageTint, colors.pageTintEnd]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.pageTint}
      />
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.flatList}
      />

      {/* Pagination pill dots */}
      <View style={styles.paginationRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeIndex ? styles.activeDot : styles.inactiveDot,
            ]}
          />
        ))}
      </View>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleGetStarted}
          style={[styles.buttonTouch, shadows.primaryButton]}
        >
          <LinearGradient
            colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    flatList: {
      flex: 1,
    },
    slide: {
      width: SCREEN_WIDTH,
      alignItems: "center",
    },
    brandTitle: {
      marginTop: 110,
      fontSize: 40,
      fontFamily: typography.families.poppinsRegular,
      color: colors.primary,
      textAlign: "center",
    },
    brandTitleLess: {
      color: "#38BDF8",
      fontWeight: "600",
    },
    illustrationWrap: {
      marginTop: 18,
      width: SCREEN_WIDTH,
      height: 315,
      alignItems: "center",
      justifyContent: "center",
    },
    illustration: {
      width: "100%",
      height: "100%",
    },
    heading: {
      marginTop: 26,
      fontSize: 22,
      fontFamily: typography.families.poppinsMedium,
      fontWeight: "500",
      color: colors.textPrimary,
      textAlign: "center",
    },
    subtitle: {
      marginTop: 12,
      maxWidth: 284,
      fontSize: 14,
      fontFamily: typography.families.interRegular,
      color: colors.muted,
      textAlign: "center",
      lineHeight: 20,
    },
    paginationRow: {
      position: "absolute",
      top: 648,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
    },
    dot: {
      height: 8,
      borderRadius: 4,
    },
    inactiveDot: {
      width: 8,
      backgroundColor: colors.border,
    },
    activeDot: {
      width: 16,
      backgroundColor: colors.primary,
    },
    bottomBar: {
      position: "absolute",
      top: 728,
      left: 0,
      right: 0,
      alignItems: "center",
    },
    buttonTouch: {
      width: 311,
      height: 52,
      borderRadius: radii.button,
    },
    buttonGradient: {
      width: "100%",
      height: "100%",
      borderRadius: radii.button,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonText: {
      color: "#FFFFFF",
      fontSize: 17,
      fontFamily: typography.families.interSemiBold,
      fontWeight: "600",
    },
  });
}
