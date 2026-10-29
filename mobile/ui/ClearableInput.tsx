import { ComponentRef, Ref, useRef } from "react";
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from "react-native";
import Icon from "./Icon";
import { Palette, TOUCH } from "./theme";
import { useStyles, useTheme } from "./ThemeContext";

// The handle a screen gets from a ref on a text field (type of the focus() object).
type Handle = ComponentRef<typeof TextInput>;

interface Props extends TextInputProps {
  ref?: Ref<Handle>;
  value: string;
  onChangeText: (text: string) => void;
  // Read out by screen readers for the clear button, for example "Clear client name".
  clearLabel?: string;
}

// A text field with a clear (x) button on its right side that appears once something is typed.
export default function ClearableInput({ ref, style, value, onChangeText, clearLabel = "Clear", ...rest }: Props) {
  const { colors } = useTheme();
  const s = useStyles(makeStyles);
  const inner = useRef<Handle | null>(null);

  // Keeps our own handle for refocusing while still passing the node on to the screen's ref.
  const attach = (node: Handle | null) => {
    inner.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <View>
      <TextInput {...rest} ref={attach} value={value} onChangeText={onChangeText} style={[style, s.room]} />
      {value !== "" && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          onPress={() => {
            onChangeText("");
            inner.current?.focus(); // ready to type again
          }}
          style={s.clear}
        >
          <Icon name="close-circle" size={22} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (_colors: Palette) =>
  StyleSheet.create({
    // Room on the right so typed text never runs underneath the button.
    room: { paddingRight: TOUCH },
    clear: { position: "absolute", right: 0, top: 0, bottom: 0, width: TOUCH, alignItems: "center", justifyContent: "center" },
  });
