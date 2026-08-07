import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { T } from "./theme";
import { Icon } from "./icons";

export function Btn({ variant = "secondary", block, style, textStyle, children, onPress }) {
  const variants = {
    primary: { background: T.accent, color: T.bg },
    secondary: { borderColor: T.divider, color: T.text },
    ghost: { color: T.accent },
  };
  const v = variants[variant];
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.btnBase,
        variant === "primary" && { backgroundColor: v.background },
        variant === "secondary" && { borderColor: v.borderColor, borderWidth: 1 },
        block && { width: "100%", marginTop: 8 },
        style,
      ]}
    >
      <Text style={[styles.btnText, { color: v.color }, textStyle]}>{children}</Text>
    </TouchableOpacity>
  );
}

export function Tag({ children, outline }) {
  return (
    <View style={[styles.tag, outline ? styles.tagOutline : styles.tagFilled]}>
      <Text style={outline ? styles.tagTextOutline : styles.tagTextFilled}>{children}</Text>
    </View>
  );
}

export function Field({ label, children }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export function StyledInput(props) {
  return <TextInput placeholderTextColor="rgba(32,30,29,0.4)" style={[styles.input, props.style]} {...props} />;
}

export function RowItem({ it, onOpen, size = 40, showMeta = false }) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onOpen} style={styles.row}>
      <View style={[styles.rowIconBox, { width: size, height: size }]}>
        <Icon.Box size={size === 40 ? 16 : 18} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{it.name}</Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>{it.position}</Text>
        {showMeta && (
          <Text style={styles.rowMeta}>{it.date} · Ajouté par {it.addedBy}</Text>
        )}
      </View>
      <Tag outline>{it.category}</Tag>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btnBase: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 15,
    backgroundColor: "transparent",
  },
  btnText: { fontWeight: "800", fontSize: 14 },
  tag: { paddingVertical: 3, paddingHorizontal: 10 },
  tagOutline: { borderWidth: 1, borderColor: T.accent },
  tagFilled: { backgroundColor: "#f8f4f4" },
  tagTextOutline: { fontSize: 11, color: T.accent },
  tagTextFilled: { fontSize: 11, color: "#444141" },
  fieldLabel: { fontSize: 12, marginBottom: 5, color: "rgba(32,30,29,0.7)" },
  input: {
    width: "100%",
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: T.text,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.divider,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.divider,
  },
  rowIconBox: {
    backgroundColor: T.neutral200,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowTitle: { fontWeight: "800", fontSize: 14, color: T.text },
  rowSubtitle: { fontSize: 12, opacity: 0.6, color: T.text },
  rowMeta: { fontSize: 11, opacity: 0.45, marginTop: 2, color: T.text },
});
