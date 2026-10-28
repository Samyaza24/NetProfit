import { ElementRef, useEffect, useRef, useState } from "react";
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { friendlyError } from "../lib/errors";
import {
  createLocalCustomer,
  createTransaction,
  Customer,
  findCustomerByName,
  hasRecentTransaction,
  searchCustomers,
} from "../db/repo";
import { getMeta, setMeta } from "../db/schema";
import { Badge, Button, Chip, Segmented } from "../ui/components";
import { colors, formatPHP, radius, space, TOUCH, type } from "../ui/theme";
import { useToast } from "../ui/Toast";

const TIERS: { label: string; days: number; amount: number }[] = [
  { label: "1 Day", days: 1, amount: 20 },
  { label: "5 Days", days: 5, amount: 50 },
  { label: "7 Days", days: 7, amount: 70 },
  { label: "1 Month", days: 30, amount: 200 },
];

type Status = "Paid" | "Unpaid";

export default function TransactionScreen() {
  const [name, setName] = useState("");
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [existing, setExisting] = useState<Customer | null>(null);
  const [tier, setTier] = useState(TIERS[0]);
  const [status, setStatus] = useState<Status>("Paid");
  const [confirmDup, setConfirmDup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const [toast, showToast] = useToast();
  const input = useRef<ElementRef<typeof TextInput>>(null);

  useEffect(() => {
    getMeta("last_tier_days").then((d) => {
      const last = TIERS.find((t) => String(t.days) === d);
      if (last) setTier(last);
    });
  }, []);

  useEffect(() => {
    const q = name.trim();
    setConfirmDup(false);
    setError(null);
    if (!q) {
      setSuggestions([]);
      setExisting(null);
      return;
    }
    searchCustomers(q).then(setSuggestions);
    findCustomerByName(q).then(setExisting);
  }, [name, tier, status]);

  async function submit() {
    if (busy.current) return; // a ref, so a fast double tap cannot save twice or create a duplicate client
    const clean = name.trim();
    if (!clean) {
      setError("Type the client's name first.");
      return;
    }
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      let customer = existing ?? (await findCustomerByName(clean));
      if (customer && !confirmDup && (await hasRecentTransaction(customer.id, tier.days))) {
        setConfirmDup(true);
        return;
      }
      if (!customer) customer = await createLocalCustomer(clean);
      await createTransaction(customer.id, tier.amount, tier.days, status);
      await setMeta("last_tier_days", String(tier.days));
      showToast(`Saved - ${customer.name}, ${formatPHP(tier.amount)} (${status})`);
      setName("");
      input.current?.focus();
    } catch (e) {
      setError(friendlyError(e).message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  const isNew = name.trim() !== "" && !existing;
  const others = suggestions.filter((c) => c.id !== existing?.id);

  return (
    <View style={s.root}>
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text style={s.label}>Customer</Text>
      <TextInput
        ref={input}
        style={s.input}
        value={name}
        onChangeText={setName}
        placeholder="Type a name"
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={80}
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
        accessibilityLabel="Customer name"
      />
      {isNew && <Badge label="New client" color={colors.warning} />}
      {others.length > 0 && name.trim() !== "" && (
        <View style={s.row}>
          {others.map((c) => (
            <Chip key={c.id} label={c.name} selected={false} onPress={() => setName(c.name)} />
          ))}
        </View>
      )}

      <Text style={s.label}>Plan</Text>
      <View style={s.row}>
        {TIERS.map((t) => (
          <View key={t.label} style={s.tierCell}>
            <Chip
              role="radio"
              label={`${t.label} - ${t.amount}`}
              selected={tier.days === t.days}
              onPress={() => setTier(t)}
            />
          </View>
        ))}
      </View>

      <Text style={s.label}>Payment</Text>
      <Segmented
        options={[
          ["Paid", "Paid"],
          ["Unpaid", "Unpaid"],
        ]}
        value={status}
        onChange={setStatus}
      />

      {confirmDup && (
        <Text style={s.warn} accessibilityRole="alert">
          {name.trim()} already has this tier in the last 2 minutes. Save again?
        </Text>
      )}
      {error && (
        <Text style={s.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
      <Button
        icon="checkmark"
        title={confirmDup ? "Yes, record again" : `Save ${formatPHP(tier.amount)}`}
        onPress={submit}
        loading={saving}
      />
    </ScrollView>
    {toast}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: space.lg, paddingBottom: space.xl * 3, gap: space.md },
  label: { fontSize: type.small, fontWeight: "700", color: colors.muted, textTransform: "uppercase" },
  input: { minHeight: TOUCH, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: type.body, color: colors.text },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  tierCell: { width: "48%" },
  warn: { color: colors.warning, fontWeight: "600" },
  error: { color: colors.danger, fontSize: type.body, fontWeight: "600" },
});
