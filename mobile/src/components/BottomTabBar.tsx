import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { radii, shadows } from '../theme/theme';
import {
  HomeIcon,
  BellIcon,
  MegaphoneIcon,
  QueueTabIcon,
  GridIcon,
  PersonIcon,
} from '../assets/icons/AppIcons';

interface CustomBottomTabBarProps extends BottomTabBarProps {
  unreadCount?: number;
  isBusiness?: boolean;
}

export const BottomTabBar: React.FC<CustomBottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
  unreadCount = 0,
  isBusiness = false,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const safeBottom = Math.max(insets.bottom, 12);
  const totalHeight = 64 + safeBottom;

  return (
    <View
      style={[
        styles.container,
        shadows.tabBar,
        {
          height: totalHeight,
          paddingBottom: safeBottom,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      ]}
    >
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const iconColor = isFocused ? colors.primary : colors.muted;

          const renderIcon = () => {
            if (route.name === 'Home') {
              return <HomeIcon size={26} color={iconColor} focused={isFocused} />;
            }
            if (route.name === 'Notifications') {
              return (
                <View style={styles.iconWithBadge}>
                  <BellIcon size={26} color={iconColor} focused={isFocused} />
                  {unreadCount > 0 && <View style={styles.unreadDot} />}
                </View>
              );
            }
            if (route.name === 'Updates') {
              return <MegaphoneIcon size={26} color={iconColor} focused={isFocused} />;
            }
            if (route.name === 'MyQueue') {
              return <QueueTabIcon size={26} color={iconColor} focused={isFocused} />;
            }
            if (route.name === 'Dashboard') {
              return <GridIcon size={26} color={iconColor} focused={isFocused} />;
            }
            if (route.name === 'Profile') {
              return <PersonIcon size={26} color={iconColor} focused={isFocused} />;
            }
            return <HomeIcon size={26} color={iconColor} focused={isFocused} />;
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel || route.name}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.7}
              style={styles.tabButton}
            >
              <View style={styles.iconContainer}>
                {renderIcon()}
                {/* 12x4 #284D83 pill indicator 8px below active icon */}
                {isFocused && (
                  <View style={[styles.activePill, { backgroundColor: colors.primary }]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: radii.tabBar, // top radius 36
    borderTopRightRadius: radii.tabBar,
    borderTopWidth: 1,
    borderTopColor: '#EAE8E8',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tabRow: {
    flexDirection: 'row',
    height: 64,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  iconWithBadge: {
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: -1,
    right: -2,
    width: 8, // 8px #FC0015
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FC0015',
  },
  activePill: {
    width: 12, // 12x4 pill
    height: 4,
    borderRadius: 2,
    marginTop: 8, // 8px below it
  },
});

export default BottomTabBar;
