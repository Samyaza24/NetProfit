import { useState } from "react";
import { Alert, Button, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { storeCredentials } from "../sync/syncClient";

interface Props {
  onPaired: () => void;
}

export default function PairScreen({ onPaired }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleScan({ data }: { data: string }) {
    if (busy) return;
    setBusy(true);
    setScanning(false);
    try {
      const payload = JSON.parse(data) as { pairing_code: string; server_url: string };
      const res = await fetch(`${payload.server_url}/devices/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairing_code: payload.pairing_code, label: "Field Phone" }),
      });
      if (!res.ok) throw new Error(`Pairing failed: ${res.status}`);
      const result = await res.json();
      await storeCredentials(result.token, result.server_url, result.device_id);
      onPaired();
    } catch (e) {
      Alert.alert("Pairing failed", String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>Camera access is needed to scan the pairing QR code.</Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  if (!scanning) {
    return (
      <View style={styles.container}>
        <Text>Pair this phone with your NetProfit desktop server.</Text>
        <Button title="Scan Pairing QR" onPress={() => setScanning(true)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={handleScan}
      />
      <Button title="Cancel" onPress={() => setScanning(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16, gap: 12 },
  camera: { width: "100%", height: 400 },
});
