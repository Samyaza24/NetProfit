import { useCallback, useEffect, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { friendlyError } from "./lib/errors";
import { ErrorState } from "./ui/components";
import ErrorBoundary from "./ui/ErrorBoundary";
import PairScreen from "./screens/PairScreen";
import RecordScreen from "./screens/RecordScreen";
import { Prefill } from "./screens/TransactionScreen";
import CustomersScreen from "./screens/CustomersScreen";
import HistoryScreen from "./screens/HistoryScreen";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import SyncScreen from "./screens/SyncScreen";
import FadeIn from "./ui/FadeIn";
import StatusStrip from "./ui/StatusStrip";
import TabBar from "./ui/TabBar";
import { Palette } from "./ui/theme";
import { ThemeProvider, useStyles, useTheme } from "./ui/ThemeContext";
import { useKeyboardVisible } from "./ui/useKeyboardVisible";
import { ReducedMotionProvider } from "./ui/useReducedMotion";
import { isPaired, syncNow } from "./sync/syncClient";

type Screen = "record" | "customers" | "history" | "analytics" | "sync";

const TABS: [Screen, string, string][] = [
  ["record", "Record", "add-circle"],
  ["customers", "Clients", "people"],
  ["history", "History", "time"],
  ["analytics", "Stats", "stats-chart"],
  ["sync", "Sync", "sync"],
];

export default function App() {
  return (
    <SafeAreaProvider>
      <ReducedMotionProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <AppRoot />
          </ErrorBoundary>
        </ThemeProvider>
      </ReducedMotionProvider>
    </SafeAreaProvider>
  );
}

function AppRoot() {
  const styles = useStyles(makeStyles);
  const { dark } = useTheme();
  const insets = useSafeAreaInsets();
  const [paired, setPaired] = useState<boolean | null>(null);
  const [pairingAgain, setPairingAgain] = useState(false); // true when pairing was chosen from the Sync tab, so Cancel can go back
  const [screen, setScreen] = useState<Screen>("record");
  // Tabs are mounted the first time they are opened and then kept, so drafts, filters and scroll survive.
  const [visited, setVisited] = useState<Set<Screen>>(new Set(["record"]));
  const keyboardUp = useKeyboardVisible(); // the tab bar hides while typing so it does not ride above the keyboard
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
            setPairingAgain(false);
            setPaired(true);
            syncNow().catch(() => undefined); // first pull, so a phone paired to a PC with data is not empty
          }}
          onCancel={
            pairingAgain
              ? () => {
                  setPairingAgain(false);
                  setPaired(true);
                }
              : undefined
          }
        />
        <StatusBar style={dark ? "light" : "dark"} />
      </View>
    );
  }

  const tab = (key: Screen) => {
    const active = screen === key;
    switch (key) {
      case "record":
        return <RecordScreen prefill={prefill} />;
      case "customers":
        return (
          <CustomersScreen
            active={active}
            onSellAgain={(name, days) => {
              setPrefill({ name, days, nonce: Date.now() });
              go("record");
            }}
          />
        );
      case "history":
        return <HistoryScreen active={active} />;
      case "analytics":
        return <AnalyticsScreen active={active} />;
      case "sync":
        return (
          <SyncScreen
            active={active}
            onNeedsRePair={() => {
              setPairingAgain(true);
              setPaired(false);
            }}
          />
        );
    }
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
      <StatusBar style={dark ? "light" : "dark"} />
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  hidden: { display: "none" },
});
