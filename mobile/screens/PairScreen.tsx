import { useEffect, useRef, useState } from "react";
import { BackHandler, KeyboardAvoidingView, Linking, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { checkServerUrl, shortAddress } from "../lib/address";
import { friendlyError } from "../lib/errors";
import { fetchWithTimeout } from "../lib/http";
import { storeCredentials } from "../sync/syncClient";
import { Button } from "../ui/components";
import ClearableInput from "../ui/ClearableInput";
import Logo from "../ui/Logo";
import { Palette, radius, space, TOUCH, type } from "../ui/theme";
import { useStyles, useTheme } from "../ui/ThemeContext";

interface Props {
  onPaired: () => void;
  // Set when the phone is already paired and the operator chose to pair again, so they can back out.
  onCancel?: () => void;
}

type Step = "home" | "scan" | "manual" | "confirm";

export default function PairScreen({ onPaired, onCancel }: Props) {
  const { colors } = useTheme();
  const s = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>("home");
  const [target, setTarget] = useState<{ code: string; url: string } | null>(null);
  const [typedUrl, setTypedUrl] = useState("");
  const [typedCode, setTypedCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanned = useRef(false);

  // Android Back steps out of scan, typed entry and the confirmation instead of closing the app.
  useEffect(() => {
    if (step === "home") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setStep("home");
      return true;
    });
    return () => sub.remove();
  }, [step]);

  // Every way of getting an address and code ends here: check the address, then ask before connecting.
  function propose(url: unknown, code: unknown) {
    const checked = checkServerUrl(url);
    if (!checked.ok) {
      setError(checked.reason);
      setStep("home");
      return;
    }
    if (typeof code !== "string" || !code.trim()) {
      setError("That code has no pairing code in it.");
      setStep("home");
      return;
    }
    setError(null);
    setTarget({ code: code.trim(), url: checked.url });
    setStep("confirm");
  }

  function handleScan({ data }: { data: string }) {
    if (scanned.current) return; // the camera reports the same code many times a second
    scanned.current = true;
    try {
      const payload = JSON.parse(data) as { pairing_code?: unknown; server_url?: unknown };
      propose(payload.server_url, payload.pairing_code);
    } catch (e) {
      setError(friendlyError(e).message);
      setStep("home");
    } finally {
      setTimeout(() => (scanned.current = false), 1000);
    }
  }

  async function startScan() {
    setError(null);
    if (permission?.granted) return setStep("scan");
    if (permission && !permission.canAskAgain) {
      setError("Camera access is off for NetProfit. Turn it on in the phone's settings, or type the details instead.");
      return Linking.openSettings();
    }
    if ((await requestPermission()).granted) setStep("scan");
  }

  async function connect() {
    if (!target || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetchWithTimeout(`${target.url}/devices/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairing_code: target.code, label: "Field Phone" }),
      });
      if (!res.ok) throw new Error(`Pairing failed: ${res.status}`);
      const result = await res.json();
      // Keep using the address we checked unless the server names another acceptable one.
      const reported = checkServerUrl(result.server_url);
      await storeCredentials(result.token, reported.ok ? reported.url : target.url, result.device_id);
      onPaired();
    } catch (e) {
      setError(friendlyError(e).message);
      setStep("home");
    } finally {
      setBusy(false);
    }
  }

  if (step === "scan") {
    return (
      <View style={s.scan}>
        <CameraView style={s.camera} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={handleScan} />
        <View style={[s.cancel, { paddingBottom: space.lg + insets.bottom }]}>
          <Button title="Cancel" variant="secondary" onPress={() => setStep("home")} />
        </View>
      </View>
    );
  }

  if (step === "confirm" && target) {
    return (
      <View style={s.container}>
        <Logo height={64} />
        <Text style={s.title}>Connect to this PC?</Text>
        <Text style={s.address} selectable>
          {shortAddress(target.url)}
        </Text>
        <Text style={s.body}>Only continue if this is the address of your shop PC. Your pairing code is sent to it.</Text>
        {error && (
          <Text style={s.error} accessibilityRole="alert">
            {error}
          </Text>
        )}
        <Button title="Connect" icon="checkmark" onPress={connect} loading={busy} />
        <Button title="Cancel" variant="secondary" onPress={() => setStep("home")} disabled={busy} />
      </View>
    );
  }

  if (step === "manual") {
    return (
      <KeyboardAvoidingView style={s.flex} behavior="padding">
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>Type the details</Text>
          <Text style={s.body}>On the PC, the Pair page shows the address under the QR code, and the code can be copied.</Text>
          <Text style={s.label}>PC address</Text>
          <ClearableInput
            clearLabel="Clear PC address"
            style={s.input}
            value={typedUrl}
            onChangeText={setTypedUrl}
            placeholder="Example: http://192.168.1.5:8001/api/v1"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            accessibilityLabel="PC address"
          />
          <Text style={s.label}>Pairing code</Text>
          <ClearableInput
            clearLabel="Clear pairing code"
            style={s.input}
            value={typedCode}
            onChangeText={setTypedCode}
            placeholder="Paste or type the code"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Pairing code"
          />
          {error && (
            <Text style={s.error} accessibilityRole="alert">
              {error}
            </Text>
          )}
          <Button title="Continue" onPress={() => propose(typedUrl, typedCode)} />
          <Button title="Back" variant="secondary" onPress={() => setStep("home")} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
      <Button title="Scan pairing QR" icon="qr-code-outline" onPress={startScan} />
      <Button title="Type the details instead" variant="secondary" onPress={() => setStep("manual")} />
      {onCancel && <Button title="Cancel" variant="secondary" onPress={onCancel} />}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: "center", padding: space.xl, gap: space.md },
  logo: { alignItems: "center", marginBottom: space.lg },
  title: { fontSize: type.big, fontWeight: "700", color: colors.text },
  body: { fontSize: type.body, color: colors.muted },
  address: { fontSize: type.title, fontWeight: "700", color: colors.primary },
  label: { fontSize: type.small, fontWeight: "700", color: colors.muted, textTransform: "uppercase" },
  input: { minHeight: TOUCH, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: type.body, color: colors.text },
  error: { fontSize: type.body, color: colors.danger },
  scan: { flex: 1 },
  camera: { flex: 1 },
  cancel: { padding: space.lg },
});
