import { useCallback, useEffect, useState } from "react";
import { BackHandler, Keyboard, Platform, StyleSheet, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { friendlyError } from "./lib/errors";
import { ErrorState } from "./ui/components";
import ErrorBoundary from "./ui/ErrorBoundary";
import PairScreen from "./screens/PairScreen";
import RecordScreen from "./screens/RecordScreen";
import { Prefill } from "./screens/TransactionScreen";
import CustomersScreen from "./screens/CustomersScreen";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import SyncTab from "./screens/SyncTab";
import FadeIn from "./ui/FadeIn";
import StatusStrip from "./ui/StatusStrip";
import TabBar from "./ui/TabBar";
import { colors } from "./ui/theme";
import { ReducedMotionProvider } from "./ui/useReducedMotion";
import { isPaired, syncNow } from "./sync/syncClient";

type Screen = "record" | "customers" | "analytics" | "sync";

const TABS: [Screen, string, string][] = [
  ["record", "Record", "add-circle"],
  ["customers", "Clients", "people"],
  ["analytics", "Stats", "stats-chart"],
  ["sync", "Sync", "sync"],
];

export default function App() {
  return (
    <SafeAreaProvider>
      <ReducedMotionProvider>
        <ErrorBoundary>
          <AppRoot />
        </ErrorBoundary>
      </ReducedMotionProvider>
    </SafeAreaProvider>
  );
}

function AppRoot() {
  const insets = useSafeAreaInsets();
  const [paired, setPaired] = useState<boolean | null>(null);
  const [screen, setScreen] = useState<Screen>("record");
  // Tabs are mounted the first time they are opened and then kept, so drafts, filters and scroll survive.
  const [visited, setVisited] = useState<Set<Screen>>(new Set(["record"]));
  const [keyboardUp, setKeyboardUp] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<Prefill | null>(null);

  const start = useCallback(() => {
    setStartError(null);
    isPaired().then(setPaired, (e) => setStartError(friendlyError(e).message));
  }, []);

  useEffect(start, [start]);

  const go = useCallback((next: Screen) => {
    setScreen(next);
    setVisited((v) => (v.has(next) ? v : new Set(v).add(next)));
  }, []);

  // Hide the tab bar while typing so it does not ride above the keyboard.
  useEffect(() => {
    const [showEvent, hideEvent] = Platform.OS === "ios" ? ["keyboardWillShow", "keyboardWillHide"] : ["keyboardDidShow", "keyboardDidHide"];
    const show = Keyboard.addListener(showEvent as "keyboardDidShow", () => setKeyboardUp(true));
    const hide = Keyboard.addListener(hideEvent as "keyboardDidHide", () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Android Back: from any other tab go to Record; on Record let the system leave the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (paired && screen !== "record") {
        go("record");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [paired, screen, go]);

  const root = [styles.root, { paddingTop: insets.top }];

  if (startError) {
    return (
      <View style={root}>
        <ErrorState message={startError} onRetry={start} />
      </View>
    );
  }

  if (paired === null) return <View style={root} />;

  if (!paired) {
    return (
      <View style={root}>
        <PairScreen
          onPaired={() => {
            setPaired(true);
            syncNow().catch(() => undefined); // first pull, so a phone paired to a PC with data is not empty
          }}
        />
        <StatusBar style="auto" />
      </View>
    );
  }

  const tab = (key: Screen) => {
    const active = screen === key;
    if (key === "record") return <RecordScreen prefill={prefill} />;
    if (key === "customers") {
      return (
        <CustomersScreen
          active={active}
          onSellAgain={(name, days) => {
            setPrefill({ name, days, nonce: Date.now() });
            go("record");
          }}
        />
      );
    }
    if (key === "analytics") return <AnalyticsScreen active={active} />;
    return <SyncTab active={active} onNeedsRePair={() => setPaired(false)} />;
  };

  return (
    <View style={root}>
      <StatusStrip onPress={() => go("sync")} />
      {TABS.map(([key]) =>
        visited.has(key) ? (
          <FadeIn key={key} style={[styles.body, key !== screen && styles.hidden]}>
            {tab(key)}
          </FadeIn>
        ) : null
      )}
      {!keyboardUp && <TabBar tabs={TABS} active={screen} onChange={go} />}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  hidden: { display: "none" },
});
