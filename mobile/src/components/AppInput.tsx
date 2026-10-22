import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radii } from '../theme/theme';
import { EyeIcon, EyeOffIcon } from '../assets/icons/AppIcons';

interface Props {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  leftElement?: React.ReactNode;
  rightAction?: React.ReactNode;
  error?: string;
  helperText?: string;
  multiline?: boolean;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
  editable?: boolean;
  maxLength?: number;
}

export default function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  leftElement,
  rightAction,
  error,
  helperText,
  multiline = false,
  numberOfLines = 1,
  style,
  editable = true,
  maxLength,
}: Props) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPassword = Boolean(secureTextEntry);
  const effectiveSecure = isPassword && !isPasswordVisible;

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
          {error ? <Text style={[styles.errorLabel, { color: colors.danger }]}>{error}</Text> : null}
        </View>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.danger : isFocused ? colors.primary : colors.inputBorder,
            borderWidth: isFocused ? 1.5 : 1,
          },
          !editable && styles.inputDisabled,
          multiline && styles.inputMultiline,
        ]}
      >
        {leftElement}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          style={[
            styles.input,
            { color: colors.textPrimary },
            multiline && styles.inputFieldMultiline,
          ]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={effectiveSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          maxLength={maxLength}
        />

        {isPassword ? (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible((prev) => !prev)}
            style={styles.actionBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            {isPasswordVisible ? (
              <EyeOffIcon size={20} color={colors.textSecondary} />
            ) : (
              <EyeIcon size={20} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        ) : rightAction ? (
          <View style={styles.actionBtn}>{rightAction}</View>
        ) : null}
      </View>

      {helperText && !error ? (
        <Text style={[styles.helperText, { color: colors.muted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 20, // Group spacing towards ~28px
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8, // 8px gap between label and field
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  errorLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    fontWeight: '400',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.input, // radius 12
    height: 42, // field height 42
    paddingLeft: 12, // left padding 12
    paddingRight: 12,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  inputMultiline: {
    height: 90,
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    paddingVertical: 0,
  },
  inputFieldMultiline: {
    textAlignVertical: 'top',
  },
  actionBtn: {
    marginLeft: 8,
    padding: 4,
  },
  helperText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 4,
  },
});
