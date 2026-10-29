import { Component, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "./components";
import { Palette, space, type } from "./theme";
import { useStyles } from "./ThemeContext";

interface State {
  failed: boolean;
}

// Last line of defence: a render error shows a message and a restart button instead of a white screen.
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <Failed onReopen={() => this.setState({ failed: false })} />;
  }
}

// A function component so the message can use the theme.
function Failed({ onReopen }: { onReopen: () => void }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.box} accessibilityRole="alert">
      <Text style={s.title}>Something went wrong</Text>
      <Text style={s.body}>Your records are safe on this phone. Tap below to reopen the app.</Text>
      <Button title="Reopen" onPress={onReopen} />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    box: { flex: 1, justifyContent: "center", padding: space.xl, gap: space.md, backgroundColor: colors.bg },
    title: { fontSize: type.big, fontWeight: "700", color: colors.text },
    body: { fontSize: type.body, color: colors.muted },
  });
