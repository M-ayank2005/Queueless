import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LogoQ from './LogoQ';
import { typography } from '../theme/theme';

interface LogoFullProps {
  iconSize?: number;
  fontSize?: number;
  showTagline?: boolean;
  theme?: 'dark' | 'light';
}

export const LogoFull: React.FC<LogoFullProps> = ({
  iconSize = 38,
  fontSize = 28,
  showTagline = false,
  theme = 'light',
}) => {
  const queueColor = theme === 'dark' ? '#FFFFFF' : '#1A1A1A';

  return (
    <View style={styles.container}>
      <View style={styles.lockupRow}>
        <View style={styles.iconWrap}>
          <LogoQ size={iconSize} variant="brand" />
        </View>

        <View style={styles.textRow}>
          <Text style={[styles.queueText, { fontSize, color: queueColor }]}>
            Queue
          </Text>
          <Text style={[styles.lessText, { fontSize }]}>
            Less
          </Text>
        </View>
      </View>

      {showTagline && (
        <Text style={styles.tagline}>
          SMART DIGITAL QUEUE FLOW
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  queueText: {
    fontFamily: typography.families.interSemiBold,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  lessText: {
    fontFamily: typography.families.interSemiBold,
    fontWeight: '800',
    color: '#2563EB', // Brand radiant blue from frontend
    letterSpacing: -0.8,
  },
  tagline: {
    marginTop: 6,
    fontSize: 10,
    fontFamily: typography.families.interSemiBold,
    fontWeight: '600',
    letterSpacing: 3,
    color: '#858585',
    textTransform: 'uppercase',
  },
});

export default LogoFull;
