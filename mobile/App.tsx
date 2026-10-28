import { useEffect, useState } from "react";
import { Keyboard, Platform, SafeAreaView, StatusBar as RNStatusBar, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import PairScreen from "./screens/PairScreen";
import RecordScreen from "./screens/RecordScreen";
import CustomersScreen from "./screens/CustomersScreen";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import SyncTab from "./screens/SyncTab";
import StatusStrip from "./ui/StatusStrip";
import TabBar from "./ui/TabBar";
import { colors } from "./ui/theme";
import { isPaired } from "./sync/syncClient";

type Screen = "record" | "customers" | "analytics" | "sync";

const TABS: [Screen, string, string][] = [
  ["record", "Record", "add-circle"],
  ["customers", "Clients", "people"],
  ["analytics", "Stats", "stats-chart"],
  ["sync", "Sync", "sync"],
];

export default function App() {
  const [paired, setPaired] = useState<boolean | null>(null);
  const [screen, setScreen] = useState<Screen>("record");
  const [keyboardUp, setKeyboardUp] = useState(false);

  useEffect(() => {
    isPaired().then(setPaired);
  }, []);

  // Hide the tab bar while typing so it does not ride above the keyboard.
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardUp(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (paired === null) return <View style={styles.root} />;

  if (!paired) {
    return (
      <SafeAreaView style={styles.root}>
        <PairScreen onPaired={() => setPaired(true)} />
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusStrip onPress={() => setScreen("sync")} />
      <View style={styles.body}>
        {screen === "record" && <RecordScreen />}
        {screen === "customers" && <CustomersScreen />}
        {screen === "analytics" && <AnalyticsScreen />}
        {screen === "sync" && <SyncTab onNeedsRePair={() => setPaired(false)} />}
      </View>
      {!keyboardUp && <TabBar tabs={TABS} active={screen} onChange={setScreen} />}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight ?? 0 : 0 },
  body: { flex: 1 },
});
