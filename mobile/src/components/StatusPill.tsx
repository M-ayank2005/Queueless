import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radii } from '../theme/theme';

export type StatusPillType =
  | 'open'
  | 'close_soon'
  | 'closed'
  | 'waiting'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'custom';

interface StatusPillProps {
  status?: string;
  type?: StatusPillType;
  label?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, type, label }) => {
  const { colors } = useTheme();

  let resolvedType: StatusPillType = type || 'waiting';
  let resolvedLabel = label;

  if (status) {
    const s = status.toLowerCase();
    if (s === 'open') {
      resolvedType = 'open';
      resolvedLabel = resolvedLabel || 'Open';
    } else if (s === 'close_soon' || s === 'close soon') {
      resolvedType = 'close_soon';
      resolvedLabel = resolvedLabel || 'Close Soon';
    } else if (s === 'closed') {
      resolvedType = 'closed';
      resolvedLabel = resolvedLabel || 'Closed';
    } else if (s === 'waiting') {
      resolvedType = 'waiting';
      resolvedLabel = resolvedLabel || 'Waiting';
    } else if (s === 'in_progress' || s === 'serving') {
      resolvedType = 'in_progress';
      resolvedLabel = resolvedLabel || 'Now Serving';
    } else if (s === 'completed') {
      resolvedType = 'completed';
      resolvedLabel = resolvedLabel || 'Completed';
    } else if (s === 'cancelled') {
      resolvedType = 'cancelled';
      resolvedLabel = resolvedLabel || 'Cancelled';
    }
  }

  let bg = colors.statusWaitingBg;
  let textColor = colors.statusWaitingText;

  switch (resolvedType) {
    case 'open':
      bg = colors.statusOpenBg; // #C6E5D2
      textColor = colors.statusOpenText; // #047857
      resolvedLabel = resolvedLabel || 'Open';
      break;
    case 'close_soon':
      bg = colors.statusCloseSoonBg; // #F3C3AD
      textColor = colors.statusCloseSoonText; // #F9773B
      resolvedLabel = resolvedLabel || 'Close Soon';
      break;
    case 'closed':
      bg = colors.statusClosedBg; // #F4A8AE
      textColor = colors.statusClosedText; // #FC0015
      resolvedLabel = resolvedLabel || 'Closed';
      break;
    case 'waiting':
      bg = colors.statusWaitingBg; // #E6EDF7
      textColor = colors.statusWaitingText; // #284D83
      resolvedLabel = resolvedLabel || 'Waiting';
      break;
    case 'in_progress':
      bg = '#C6E5D2';
      textColor = '#047857';
      resolvedLabel = resolvedLabel || 'Now Serving';
      break;
    case 'completed':
      bg = '#C6E5D2';
      textColor = '#047857';
      resolvedLabel = resolvedLabel || 'Completed';
      break;
    case 'cancelled':
      bg = colors.statusClosedBg; // #F4A8AE
      textColor = colors.statusClosedText; // #FC0015
      resolvedLabel = resolvedLabel || 'Cancelled';
      break;
    case 'custom':
      break;
  }

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: textColor }]}>
        {resolvedLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    height: 23, // Height 22-24
    borderRadius: radii.full, // Fully rounded
    paddingHorizontal: 14, // Horizontal padding 14
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  pillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12, // 12px/500 text
    fontWeight: '500',
    lineHeight: 14,
  },
});

export default StatusPill;
