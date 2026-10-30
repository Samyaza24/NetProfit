import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "./components";
import Icon from "./Icon";
import { Palette, radius, space, TOUCH, type } from "./theme";
import { useStyles, useTheme } from "./ThemeContext";

interface Props {
  visible: boolean;
  // The month shown now (first day of it).
  value: Date;
  onPick: (month: Date) => void;
  onClose: () => void;
}

const NAMES = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString("en-PH", { month: "short" }));

// Pick any month: a year stepper above a 4 x 3 grid of month names.
export default function MonthPicker({ visible, value, onPick, onClose }: Props) {
  const { colors } = useTheme();
  const s = useStyles(makeStyles);
  const [year, setYear] = useState(value.getFullYear());
  useEffect(() => {
    if (visible) setYear(value.getFullYear());
  }, [visible, value]);
  const now = new Date();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.backdrop} onPress={onClose} accessible={false}>
        <Pressable style={s.dialog} accessibilityViewIsModal onPress={() => undefined} accessible={false}>
          <View style={s.yearRow}>
            <Pressable style={s.arrow} onPress={() => setYear(year - 1)} accessibilityRole="button" accessibilityLabel="Previous year">
              <Icon name="chevron-back" size={24} color={colors.text} />
            </Pressable>
            <Text style={s.year} accessibilityRole="header">
              {year}
            </Text>
            <Pressable style={s.arrow} onPress={() => setYear(year + 1)} accessibilityRole="button" accessibilityLabel="Next year">
              <Icon name="chevron-forward" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={s.grid}>
            {NAMES.map((name, i) => {
              const picked = year === value.getFullYear() && i === value.getMonth();
              const current = year === now.getFullYear() && i === now.getMonth();
              return (
                <View key={name} style={s.cellWrap}>
                  <Pressable
                    style={[s.cell, current && s.cellNow, picked && s.cellPicked]}
                    onPress={() => onPick(new Date(year, i, 1))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: picked }}
                    accessibilityLabel={new Date(year, i, 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" })}
                  >
                    <Text style={[s.cellText, picked && s.cellTextPicked]}>{name}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
          <Button title="Close" variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "center", padding: space.xl, backgroundColor: colors.backdrop },
    dialog: { gap: space.md, padding: space.lg, borderRadius: radius.md + 4, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, elevation: 8 },
    yearRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    arrow: { width: TOUCH, height: TOUCH, alignItems: "center", justifyContent: "center" },
    year: { fontSize: type.big, fontWeight: "700", color: colors.text },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    cellWrap: { width: "25%", padding: 3 },
    cell: { minHeight: TOUCH, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
    cellNow: { borderColor: colors.primary, borderWidth: 2 },
    cellPicked: { backgroundColor: colors.primary, borderColor: colors.primary },
    cellText: { fontSize: type.body, fontWeight: "600", color: colors.text },
    cellTextPicked: { color: colors.primaryText },
  });
