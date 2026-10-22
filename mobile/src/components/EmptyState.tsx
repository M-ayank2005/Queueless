import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from './AppButton';
import { useTheme } from '../context/ThemeContext';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  customIcon?: React.ReactNode;
  iconColor?: string;
  title: string;
  description: string;
  actionTitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  onAction?: () => void;
  actionIcon?: keyof typeof Ionicons.glyphMap;
}

export default function EmptyState({
  icon = 'cube-outline',
  customIcon,
  iconColor,
  title,
  description,
  actionTitle,
  actionLabel,
  onActionPress,
  onAction,
  actionIcon,
}: Props) {
  const { colors } = useTheme();
  const effectiveIconColor = iconColor || colors.muted;
  const effectiveActionLabel = actionTitle || actionLabel;
  const effectiveActionPress = onActionPress || onAction;

  return (
    <View style={styles.container}>
      {/* 72px #F7F7F7 circle */}
      <View style={[styles.iconCircle, { backgroundColor: colors.bgSecondary }]}>
        {customIcon ? (
          customIcon
        ) : (
          <Ionicons name={icon} size={32} color={effectiveIconColor} />
        )}
      </View>

      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.muted }]}>{description}</Text>
      </View>

      {effectiveActionLabel && effectiveActionPress && (
        <View style={styles.buttonWrap}>
          <AppButton
            title={effectiveActionLabel}
            onPress={effectiveActionPress}
            icon={actionIcon}
            size="md"
            variant="primary"
            fullWidth={false}
            style={styles.actionBtn}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconCircle: {
    width: 72, // 72px circle
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  textWrap: {
    alignItems: 'center',
    maxWidth: 284,
  },
  title: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16, // 16/500
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13, // 13 muted
    textAlign: 'center',
    lineHeight: 18,
  },
  buttonWrap: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    minWidth: 180,
    maxWidth: 240,
    alignSelf: 'center',
  },
});
