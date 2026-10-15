import React, { useState } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { radii, spacing, typography } from "../theme/theme";

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  icon?: keyof typeof Ionicons.glyphMap;
  rightAction?: React.ReactNode;
  error?: string;
  helperText?: string;
  multiline?: boolean;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
  editable?: boolean;
};

/**
 * AppInput Component
 * Polished text field with leading icon support, focus highlights,
 * password visibility toggling, and contextual error messages.
 */
export default function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "sentences",
  icon,
  rightAction,
  error,
  helperText,
  multiline = false,
  numberOfLines = 1,
  style,
  editable = true,
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPassword = Boolean(secureTextEntry);
  const effectiveSecure = isPassword && !isPasswordVisible;

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, isFocused && styles.labelFocused]}>{label}</Text>
        {error ? <Text style={styles.errorLabel}>{error}</Text> : null}
      </View>

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          Boolean(error) && styles.inputError,
          !editable && styles.inputDisabled,
          multiline && styles.inputMultiline,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={error ? colors.danger : isFocused ? colors.primary : colors.muted}
            style={styles.leadingIcon}
          />
        )}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          style={[styles.input, multiline && styles.inputFieldMultiline]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={effectiveSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
        />

        {isPassword ? (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible((prev) => !prev)}
            style={styles.actionBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={colors.muted}
            />
          </TouchableOpacity>
        ) : rightAction ? (
          <View style={styles.actionBtn}>{rightAction}</View>
        ) : null}
      </View>

      {helperText && !error ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
    width: "100%",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
    flexShrink: 1,
    marginRight: spacing.xs,
  },
  labelFocused: {
    color: colors.primaryHover,
  },
  errorLabel: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "500",
    flexShrink: 0,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.card,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  inputMultiline: {
    minHeight: 90,
    alignItems: "flex-start",
    paddingVertical: spacing.md,
  },
  leadingIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 10,
  },
  inputFieldMultiline: {
    textAlignVertical: "top",
  },
  actionBtn: {
    marginLeft: spacing.sm,
    padding: 4,
  },
  helperText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
});
