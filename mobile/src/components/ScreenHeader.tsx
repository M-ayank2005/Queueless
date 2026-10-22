import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { ChevronBackIcon } from '../assets/icons/AppIcons';

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  showBack = true,
  onBack,
  rightAction,
}) => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronBackIcon size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {rightAction && <View style={styles.rightWrap}>{rightAction}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter_500Medium',
    fontSize: 20,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  rightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default ScreenHeader;
