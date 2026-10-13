import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
};

export default function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "sentences",
}: Props) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[styles.input, isFocused && styles.inputFocused]}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 7,
    width: "100%",
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  input: {
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
});
