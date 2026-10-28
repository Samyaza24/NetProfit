import { Component, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "./components";
import { colors, space, type } from "./theme";

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
    return (
      <View style={s.box} accessibilityRole="alert">
        <Text style={s.title}>Something went wrong</Text>
        <Text style={s.body}>Your records are safe on this phone. Tap below to reopen the app.</Text>
        <Button title="Reopen" onPress={() => this.setState({ failed: false })} />
      </View>
    );
  }
}

const s = StyleSheet.create({
  box: { flex: 1, justifyContent: "center", padding: space.xl, gap: space.md, backgroundColor: colors.bg },
  title: { fontSize: type.big, fontWeight: "700", color: colors.text },
  body: { fontSize: type.body, color: colors.muted },
});
