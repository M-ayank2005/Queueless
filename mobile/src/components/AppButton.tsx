import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { radii, shadows } from '../theme/theme';
import QueueFlowInline from './loading/QueueFlowInline';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
};

export default function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  loadingText,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  style,
  fullWidth = true,
}: Props) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const heights = {
    sm: 38,
    md: 46,
    lg: 52,
  }[size];

  const labelStyle = {
    sm: styles.labelSm,
    md: styles.labelMd,
    lg: styles.labelLg,
  }[size];

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 20,
  }[size];

  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline' || variant === 'secondary';
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';
  const isSuccess = variant === 'success';

  const labelColor = isPrimary || isSuccess
    ? '#FFFFFF'
    : isDanger
    ? colors.danger
    : isGhost
    ? colors.muted
    : colors.textPrimary;

  const content = (
    <>
      {loading ? (
        <View style={styles.contentRow}>
          <QueueFlowInline
            color={isPrimary || isSuccess ? 'white' : 'primary'}
            text={loadingText || (size === 'sm' ? undefined : title)}
          />
        </View>
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={iconSizes} color={labelColor} />
          )}
          <Text
            style={[
              styles.labelBase,
              labelStyle,
              { color: labelColor },
              isPrimary && styles.labelPrimary,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={iconSizes} color={labelColor} />
          )}
        </View>
      )}
    </>
  );

  return (
    <Animated.View
      style={[
        fullWidth && styles.fullWidth,
        isPrimary && shadows.primaryButton,
        { transform: [{ scale }] },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.pressable,
          { height: heights },
          (disabled || loading) && styles.disabled,
          style,
        ]}
      >
        {isPrimary ? (
          <LinearGradient
            colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.gradient, { height: heights, borderRadius: radii.button }]}
          >
            {content}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.flatContainer,
              {
                height: heights,
                borderRadius: radii.button,
                backgroundColor: isOutline ? colors.card : isDanger ? 'transparent' : isSuccess ? colors.success : 'transparent',
                borderColor: isOutline ? colors.outlineBorder : isSuccess ? colors.success : 'transparent',
                borderWidth: isOutline ? 1 : 0,
              },
            ]}
          >
            {content}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  pressable: {
    width: '100%',
    borderRadius: radii.button,
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
  },
  gradient: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  flatContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  labelBase: {
    fontFamily: 'Inter_500Medium',
    letterSpacing: -0.1,
  },
  labelPrimary: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 13,
  },
  labelMd: {
    fontSize: 15,
  },
  labelLg: {
    fontSize: 17,
  },
  disabled: {
    opacity: 0.5,
  },
});
