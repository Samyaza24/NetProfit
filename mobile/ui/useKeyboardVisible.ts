import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

// True while the on-screen keyboard is showing. iOS reports "will" events early enough to avoid a jump.
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const [showEvent, hideEvent] = Platform.OS === "ios" ? ["keyboardWillShow", "keyboardWillHide"] : ["keyboardDidShow", "keyboardDidHide"];
    const show = Keyboard.addListener(showEvent as "keyboardDidShow", () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent as "keyboardDidHide", () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}
