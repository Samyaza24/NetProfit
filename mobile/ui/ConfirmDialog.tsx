import { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "./components";
import Icon, { IconName } from "./Icon";
import { Palette, radius, space, type } from "./theme";
import { useStyles, useTheme } from "./ThemeContext";

interface Props {
  visible: boolean;
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  // danger: filled red confirm button and a warning icon, for actions that erase or cannot be undone.
  tone?: "primary" | "danger";
  icon?: IconName;
  busy?: boolean;
  confirmDisabled?: boolean;
  // Plain text, or any content such as a summary or a field to type in.
  children?: ReactNode;
}

// The app's one confirmation prompt: a rounded card on a dimmed screen with Cancel and a clear confirm button.
export default function ConfirmDialog({
  visible,
  title,
  confirmLabel,
  onConfirm,
  onCancel,
  tone = "primary",
  icon,
  busy,
  confirmDisabled,
  children,
}: Props) {
  const { colors } = useTheme();
  const s = useStyles(makeStyles);
  const danger = tone === "danger";
  const glyph: IconName = icon ?? (danger ? "alert-circle-outline" : "help-circle-outline");
  // Tapping outside or pressing Back cancels, except while a save is running.
  const dismiss = () => {
    if (!busy) onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <Pressable style={s.backdrop} onPress={dismiss} accessible={false}>
        {/* The inner Pressable swallows taps so touching the card does not dismiss it. */}
        <Pressable style={s.dialog} accessibilityViewIsModal onPress={() => undefined} accessible={false}>
          <View style={[s.iconWrap, danger && s.iconWrapDanger]}>
            <Icon name={glyph} size={28} color={danger ? colors.danger : colors.primary} />
          </View>
          <Text style={s.title} accessibilityRole="header">
            {title}
          </Text>
          {typeof children === "string" ? <Text style={s.body}>{children}</Text> : children}
          <View style={s.actions}>
            <Button title={confirmLabel} variant={danger ? "danger" : "primary"} onPress={onConfirm} loading={busy} disabled={confirmDisabled} />
            <Button title="Cancel" variant="secondary" onPress={onCancel} disabled={busy} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "center", padding: space.xl, backgroundColor: colors.backdrop },
    dialog: {
      gap: space.md,
      padding: space.xl,
      borderRadius: radius.md + 4,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 8,
    },
    iconWrap: { alignSelf: "center", width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
    iconWrapDanger: { backgroundColor: colors.surface },
    title: { fontSize: type.big, fontWeight: "700", color: colors.text, textAlign: "center" },
    body: { fontSize: type.body, color: colors.muted, textAlign: "center" },
    actions: { gap: space.sm, marginTop: space.xs },
  });
