import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { radii, shadows } from '../theme/theme';
import {
  BellIcon,
  CheckCircleIcon,
  HourglassIcon,
  OfferBadgeIcon,
} from '../assets/icons/AppIcons';

export type AlertCardVariant = 'info' | 'success' | 'danger' | 'alert' | 'offer' | 'queue_updated';

interface AlertCardProps {
  variant?: AlertCardVariant;
  type?: AlertCardVariant | string;
  title: string;
  time?: string;
  message?: string;
  businessName?: string;
  offerValidTill?: string;
  extraContent?: React.ReactNode;
  onPress?: () => void;
  onDismiss?: () => void;
  style?: ViewStyle;
  unread?: boolean;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  variant,
  type,
  title,
  time,
  message,
  businessName,
  offerValidTill,
  extraContent,
  onPress,
  onDismiss,
  style,
  unread = false,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  let bg = colors.alertInfoBg;
  let borderColor = colors.alertInfoBorder;
  let iconComponent = <BellIcon size={24} color={colors.alertInfoIcon} focused />;

  const effectiveVariant = (variant || type || 'info') as AlertCardVariant;

  switch (effectiveVariant) {
    case 'info':
      bg = colors.alertInfoBg;
      borderColor = colors.alertInfoBorder;
      iconComponent = <BellIcon size={24} color={colors.alertInfoIcon} focused />;
      break;
    case 'success':
      bg = colors.alertSuccessBg;
      borderColor = colors.alertSuccessBorder;
      iconComponent = <CheckCircleIcon size={24} color={colors.alertSuccessIcon} />;
      break;
    case 'danger':
    case 'alert':
    case 'queue_updated':
      bg = colors.alertDangerBg;
      borderColor = colors.alertDangerBorder;
      iconComponent = <HourglassIcon size={24} color={colors.alertDangerIcon} />;
      break;
    case 'offer':
      bg = colors.alertOfferBg;
      borderColor = colors.alertOfferBorder;
      iconComponent = <OfferBadgeIcon size={24} color={colors.alertOfferIcon} />;
      break;
  }

  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={[
        styles.card,
        shadows.alertCard,
        {
          backgroundColor: bg,
          borderColor,
        },
        style,
      ]}
    >
      {unread && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}

      <View style={styles.iconWrap}>{iconComponent}</View>

      <View style={styles.textWrap}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {time && <Text style={styles.time}>{time}</Text>}
          {onDismiss && (
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.dismissBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {businessName && (
          <Text style={styles.businessName} numberOfLines={1}>
            {businessName}
          </Text>
        )}

        {message && <Text style={styles.body}>{message}</Text>}

        {offerValidTill && (
          <Text style={styles.validTill}>
            Valid till: {offerValidTill}
          </Text>
        )}

        {extraContent}
      </View>
    </CardWrapper>
  );
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      width: '100%',
      borderRadius: radii.alert,
      borderWidth: 1,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
      position: 'relative',
      marginBottom: 16,
    },
    unreadDot: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    iconWrap: {
      marginRight: 14,
      paddingTop: 1,
    },
    textWrap: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    title: {
      fontFamily: 'Inter_500Medium',
      fontSize: 17,
      fontWeight: '500',
      color: colors.textPrimary,
      flex: 1,
    },
    time: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      color: colors.muted,
      marginLeft: 8,
    },
    dismissBtn: {
      fontSize: 14,
      color: colors.muted,
      marginLeft: 10,
    },
    businessName: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    body: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    validTill: {
      fontFamily: 'Inter_500Medium',
      fontSize: 13,
      fontWeight: '500',
      color: colors.textPrimary,
      marginTop: 6,
    },
  });
}

export default AlertCard;
