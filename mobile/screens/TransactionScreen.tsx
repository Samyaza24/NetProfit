import { ElementRef, useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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
    if (!q) {
      setSuggestions([]);
      setExisting(null);
      return;
    }
    searchCustomers(q).then(setSuggestions);
    findCustomerByName(q).then(setExisting);
  }, [name, tier, status]);

  async function submit() {
    const clean = name.trim();
    if (!clean) {
      Alert.alert("Enter a customer name");
      return;
    }
    setSaving(true);
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
      Alert.alert("Could not save", String(e));
    } finally {
      setSaving(false);
    }
  }

  const isNew = name.trim() !== "" && !existing;
  const others = suggestions.filter((c) => c.id !== existing?.id);

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>Customer</Text>
      <TextInput
        ref={input}
        style={s.input}
        value={name}
        onChangeText={setName}
        placeholder="Type a name"
        autoCapitalize="words"
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

      <Text style={s.label}>Tier</Text>
      <View style={s.row}>
        {TIERS.map((t) => (
          <View key={t.label} style={s.tierCell}>
            <Chip
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

      {toast}
      {confirmDup && (
        <Text style={s.warn}>{name.trim()} already has this tier in the last 2 minutes. Save again?</Text>
      )}
      <Button
        icon="checkmark"
        title={confirmDup ? "Yes, record again" : `Save ${formatPHP(tier.amount)}`}
        onPress={submit}
        loading={saving}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: space.lg, gap: space.md },
  label: { fontSize: type.small, fontWeight: "700", color: colors.muted, textTransform: "uppercase" },
  input: { minHeight: TOUCH, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: type.body },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  tierCell: { width: "48%" },
  warn: { color: colors.warning, fontWeight: "600" },
});
