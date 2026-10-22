import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radii } from '../theme/theme';
import StatusPill, { StatusPillType } from './StatusPill';

interface ListRowProps {
  title: string;
  subtitleNavy?: string; // line 2 in navy #284D83 13px
  subtitleGrey?: string; // line 3 grey #858585 13px
  statusPill?: {
    status?: string;
    type?: StatusPillType;
    label?: string;
  };
  rightValue?: string; // right-aligned grey 12px value at top right
  rightElement?: React.ReactNode;
  alertBadge?: string;
  onPress?: () => void;
  avatarLetter?: string;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitleNavy,
  subtitleGrey,
  statusPill,
  rightValue,
  rightElement,
  alertBadge,
  onPress,
  avatarLetter,
}) => {
  const { colors } = useTheme();

  const letter = (avatarLetter || title || 'Q').charAt(0).toUpperCase();

  const content = (
    <View style={styles.container}>
      {/* 72x72 rounded-16 tile */}
      <View style={[styles.tile, { backgroundColor: colors.brandTint }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>{letter}</Text>
      </View>

      {/* Middle info */}
      <View style={styles.middleWrap}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>

        {subtitleNavy ? (
          <Text style={[styles.line2Navy, { color: colors.primary }]} numberOfLines={1}>
            {subtitleNavy}
          </Text>
        ) : null}

        <View style={styles.line3Row}>
          {subtitleGrey ? (
            <Text style={[styles.line3Grey, { color: colors.muted }]} numberOfLines={1}>
              {subtitleGrey}
            </Text>
          ) : null}
          {statusPill && (
            <StatusPill
              status={statusPill.status}
              type={statusPill.type}
              label={statusPill.label}
            />
          )}
        </View>

        {alertBadge ? (
          <View style={[styles.alertPill, { backgroundColor: colors.alertInfoBg }]}>
            <Text style={[styles.alertPillText, { color: colors.primary }]}>
              {alertBadge}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Right side value or element */}
      <View style={styles.rightWrap}>
        {rightValue && (
          <Text style={[styles.rightValue, { color: colors.muted }]}>{rightValue}</Text>
        )}
        {rightElement}
      </View>
    </View>
  );

  const rowStyle = [styles.rowWrapper, { borderBottomColor: colors.border }];

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={rowStyle}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={rowStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  rowWrapper: {
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE8E8',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  tile: {
    width: 72, // 72x72 rounded-16 tile
    height: 72,
    borderRadius: radii.tile, // radius 16
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 26, // navy 26/600
    fontWeight: '600',
  },
  middleWrap: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16, // 16/500 black
    fontWeight: '500',
    marginBottom: 2,
  },
  line2Navy: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13, // 13px navy
    fontWeight: '500',
    marginBottom: 3,
  },
  line3Row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  line3Grey: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13, // 13px grey
    marginRight: 4,
  },
  alertPill: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  alertPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    fontWeight: '500',
  },
  rightWrap: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    marginLeft: 8,
  },
  rightValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12, // grey 12px value at top right
  },
});

export default ListRow;
