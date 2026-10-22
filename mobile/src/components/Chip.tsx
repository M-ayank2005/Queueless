import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { radii, shadows } from '../theme/theme';

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  count?: number;
}

export const Chip: React.FC<ChipProps> = ({ label, active, onPress, count }) => {
  const { colors } = useTheme();

  const displayText = count !== undefined ? `${label} (${count})` : label;

  if (active) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[styles.wrapper, shadows.activeChip]}
      >
        <LinearGradient
          colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.activeContainer}
        >
          <Text style={styles.activeLabel}>{displayText}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.wrapper,
        styles.inactiveContainer,
        {
          backgroundColor: colors.cardSoft,
          borderColor: colors.border,
          borderWidth: 1,
        },
      ]}
    >
      <Text style={[styles.inactiveLabel, { color: colors.textSecondary }]}>{displayText}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    height: 38, // Height 38
    borderRadius: radii.chip, // Radius 14
    marginRight: 16, // Gap 16
  },
  activeContainer: {
    height: 38,
    borderRadius: radii.chip,
    paddingHorizontal: 17, // Horizontal padding 17
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveContainer: {
    paddingHorizontal: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13, // 13px
    color: '#FFFFFF',
    fontWeight: '500',
  },
  inactiveLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
});

export default Chip;
