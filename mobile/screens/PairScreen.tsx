import { useEffect, useRef, useState } from "react";
import { BackHandler, Linking, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { friendlyError } from "../lib/errors";
import { fetchWithTimeout } from "../lib/http";
import { storeCredentials } from "../sync/syncClient";
import { Button } from "../ui/components";
import Logo from "../ui/Logo";
import { colors, space, type } from "../ui/theme";

interface Props {
  onPaired: () => void;
}

export default function PairScreen({ onPaired }: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanned = useRef(false);

  async function handleScan({ data }: { data: string }) {
    if (scanned.current) return; // the camera reports the same code many times a second
    scanned.current = true;
    setBusy(true);
    setScanning(false);
    setError(null);
    try {
      const payload = JSON.parse(data) as { pairing_code: string; server_url: string };
      const res = await fetchWithTimeout(`${payload.server_url}/devices/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairing_code: payload.pairing_code, label: "Field Phone" }),
      });
      if (!res.ok) throw new Error(`Pairing failed: ${res.status}`);
      const result = await res.json();
      await storeCredentials(result.token, result.server_url, result.device_id);
      onPaired();
    } catch (e) {
      setError(friendlyError(e).message);
    } finally {
      scanned.current = false;
      setBusy(false);
    }
  }

  // Android Back cancels a scan instead of closing the app.
  useEffect(() => {
    if (!scanning) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setScanning(false);
      return true;
    });
    return () => sub.remove();
  }, [scanning]);

  if (!permission) return <View />;

  if (!permission.granted) {
    // After a permanent denial the system no longer shows the prompt, so send the operator to settings.
    const blocked = !permission.canAskAgain;
    return (
      <View style={s.container}>
        <View style={s.logo}>
          <Logo height={64} />
        </View>
        <Text style={s.title}>Camera needed</Text>
        <Text style={s.body}>
          {blocked
            ? "Camera access is turned off for NetProfit. Turn it on in the phone's settings, then come back."
            : "Allow camera access to scan the pairing QR code."}
        </Text>
        <Button title={blocked ? "Open settings" : "Allow camera"} onPress={blocked ? () => Linking.openSettings() : requestPermission} />
      </View>
    );
  }

  if (!scanning) {
    return (
      <View style={s.container}>
        <View style={s.logo}>
          <Logo height={64} />
        </View>
        <Text style={s.title}>Pair this phone</Text>
        <Text style={s.body}>On your PC open the Pair page, generate a QR code, then scan it here.</Text>
        {error && (
          <Text style={s.error} accessibilityRole="alert">
            {error}
          </Text>
        )}
        <Button title="Scan pairing QR" onPress={() => setScanning(true)} loading={busy} />
      </View>
    );
  }

  return (
    <View style={s.scan}>
      <CameraView style={s.camera} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={handleScan} />
      <View style={[s.cancel, { paddingBottom: space.lg + insets.bottom }]}>
        <Button title="Cancel" variant="secondary" onPress={() => setScanning(false)} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: space.xl, gap: space.md },
  logo: { alignItems: "center", marginBottom: space.lg },
  title: { fontSize: type.big, fontWeight: "700", color: colors.text },
  body: { fontSize: type.body, color: colors.muted },
  error: { fontSize: type.body, color: colors.danger },
  scan: { flex: 1 },
  camera: { flex: 1 },
  cancel: { padding: space.lg },
});
