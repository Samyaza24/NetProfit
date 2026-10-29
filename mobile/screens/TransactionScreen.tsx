import { ComponentRef, useEffect, useRef, useState } from "react";
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { friendlyError } from "../lib/errors";
import {
  createLocalCustomer,
  createTransaction,
  Customer,
  findCustomerByName,
  hasRecentTransaction,
  listRecentCustomers,
  RecentCustomer,
  searchCustomers,
} from "../db/repo";
import { onDataChange } from "../db/events";
import { getMeta, setMeta } from "../db/schema";
import { Badge, Button, Chip, Segmented, Summary } from "../ui/components";
import ConfirmDialog from "../ui/ConfirmDialog";
import { formatPHP, Palette, radius, space, TOUCH, type } from "../ui/theme";
import { useStyles, useTheme } from "../ui/ThemeContext";
import { useToast } from "../ui/Toast";
import { useKeyboardVisible } from "../ui/useKeyboardVisible";

const TIERS: { label: string; days: number; amount: number }[] = [
  { label: "1 Day", days: 1, amount: 20 },
  { label: "5 Days", days: 5, amount: 50 },
  { label: "7 Days", days: 7, amount: 70 },
  { label: "1 Month", days: 30, amount: 200 },
];

type Status = "Paid" | "Unpaid";

// Asks the form to start with this client and plan; a new nonce means "apply it again".
export interface Prefill {
  name: string;
  days: number;
  nonce: number;
}

export default function TransactionScreen({ prefill }: { prefill?: Prefill | null }) {
  const { colors } = useTheme();
  const s = useStyles(makeStyles);
  const [name, setName] = useState("");
  const [recent, setRecent] = useState<RecentCustomer[]>([]);
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [existing, setExisting] = useState<Customer | null>(null);
  const [tier, setTier] = useState(TIERS[0]);
  const [status, setStatus] = useState<Status>("Paid");
  // The sale waiting for the operator to confirm; dup is true when the same client just bought the same plan.
  const [review, setReview] = useState<{ customer: Customer | null; dup: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const [toast, showToast] = useToast();

  // Roomy by default. If that would force scrolling (a short phone), switch to the compact layout once.
  // The keyboard being open does not count: it always shrinks the visible area.
  const [tight, setTight] = useState(false);
  const keyboard = useKeyboardVisible();
  const sizes = useRef({ view: 0, content: 0 });
  const fit = () => {
    const { view, content } = sizes.current;
    if (!tight && !keyboard && view > 0 && content > view + 1) setTight(true);
  };
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    getMeta("last_tier_days").then((d) => {
      const last = TIERS.find((t) => String(t.days) === d);
      if (last) setTier(last);
    });
  }, []);

  // "Sell again" from a client's page arrives here with the client and their last plan.
  useEffect(() => {
    if (!prefill) return;
    setName(prefill.name);
    const plan = TIERS.find((t) => t.days === prefill.days);
    if (plan) setTier(plan);
  }, [prefill]);

  // Most recent clients, refreshed whenever local data changes.
  useEffect(() => {
    const load = () => listRecentCustomers(5).then(setRecent, () => undefined);
    load();
    return onDataChange(load);
  }, []);

  // Any change to the form clears the last error.
  useEffect(() => {
    setError(null);
  }, [name, tier, status]);

  // Look up matching clients shortly after typing stops; an older answer never replaces a newer one.
  useEffect(() => {
    const q = name.trim();
    if (!q) {
      setSuggestions([]);
      setExisting(null);
      return;
    }
    let live = true;
    const timer = setTimeout(async () => {
      try {
        const [found, exact] = await Promise.all([searchCustomers(q), findCustomerByName(q)]);
        if (live) {
          setSuggestions(found);
          setExisting(exact);
        }
      } catch {
        // Suggestions are a convenience; saving still looks the client up itself.
      }
    }, 180);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [name]);

  // Step 1: check the form and show the summary; nothing is saved until the operator confirms.
  async function ask() {
    if (busy.current) return; // a ref, so a fast double tap cannot open it twice
    const clean = name.trim();
    if (!clean) {
      setError("Type the client's name first.");
      return;
    }
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      const customer = existing ?? (await findCustomerByName(clean));
      const dup = customer ? await hasRecentTransaction(customer.id, tier.days) : false;
      Keyboard.dismiss();
      setReview({ customer, dup });
    } catch (e) {
      setError(friendlyError(e).message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  // Step 2: the operator confirmed, so save. The ref keeps a fast double tap from saving twice or creating two clients.
  async function save() {
    if (busy.current || !review) return;
    const clean = name.trim();
    busy.current = true;
    setSaving(true);
    try {
      const customer = review.customer ?? (await findCustomerByName(clean)) ?? (await createLocalCustomer(clean));
      await createTransaction(customer.id, tier.amount, tier.days, status);
      await setMeta("last_tier_days", String(tier.days));
      showToast(`Saved - ${customer.name}, ${formatPHP(tier.amount)} (${status})`);
      setReview(null);
      setName("");
      input.current?.focus();
    } catch (e) {
      setReview(null);
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
    <ScrollView
      contentContainerStyle={tight ? s.containerTight : s.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onLayout={(e) => {
        sizes.current.view = e.nativeEvent.layout.height;
        fit();
      }}
      onContentSizeChange={(_, h) => {
        sizes.current.content = h;
        fit();
      }}
    >
      {!tight && <Text style={s.label}>Client</Text>}
      <TextInput
        ref={input}
        style={s.input}
        value={name}
        onChangeText={setName}
        placeholder="Type a name"
        placeholderTextColor={colors.placeholder}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={80}
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
        accessibilityLabel="Customer name"
      />
      {/* Suggestions scroll sideways so they never add a second row of height to the form. */}
      {name.trim() === "" && recent.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.chips}>
          {recent.map((r) => (
            <Chip
              key={r.name}
              label={r.name}
              selected={false}
              onPress={() => {
                setName(r.name);
                const plan = TIERS.find((t) => t.days === r.last_days);
                if (plan) setTier(plan);
              }}
            />
          ))}
        </ScrollView>
      )}
      {isNew && <Badge label="New client" color={colors.warning} />}
      {others.length > 0 && name.trim() !== "" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.chips}>
          {others.map((c) => (
            <Chip key={c.id} label={c.name} selected={false} onPress={() => setName(c.name)} />
          ))}
        </ScrollView>
      )}

      {!tight && <Text style={s.label}>Plan</Text>}
      <View style={[s.tiers, tight && s.tiersTight]} accessibilityRole="radiogroup" accessibilityLabel="Plan">
        {TIERS.map((t) => (
          <View key={t.label} style={s.tierCell}>
            <Chip
              role="radio"
              label={t.label}
              sub={`${t.amount} PHP`}
              selected={tier.days === t.days}
              onPress={() => setTier(t)}
            />
          </View>
        ))}
      </View>

      {!tight && <Text style={s.label}>Payment</Text>}
      <Segmented
        compact={tight}
        label="Payment"
        options={[
          ["Paid", "Paid"],
          ["Unpaid", "Unpaid"],
        ]}
        value={status}
        onChange={setStatus}
      />

      {error && (
        <Text style={s.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
      <Button icon="checkmark" title={`Save ${formatPHP(tier.amount)}`} onPress={ask} loading={saving} />
    </ScrollView>
    {toast}

    <ConfirmDialog
      visible={review !== null}
      title={review?.customer ? "Save this sale?" : "Add new client and save?"}
      confirmLabel="Confirm and save"
      icon="checkmark-circle-outline"
      busy={saving}
      onConfirm={save}
      onCancel={() => setReview(null)}
    >
      <Summary rows={[["Client", name.trim()], ["Plan", tier.label], ["Amount", formatPHP(tier.amount)], ["Payment", status]]} />
      {review && !review.customer && <Badge label="New client" color={colors.warning} />}
      {review?.dup && (
        <Text style={s.warn} accessibilityRole="alert">
          {name.trim()} already bought this plan in the last 2 minutes. Only confirm if it is a second sale.
        </Text>
      )}
    </ConfirmDialog>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  root: { flex: 1 },
  container: { padding: space.lg, gap: space.md },
  // Used only when the roomy layout would not fit the screen without scrolling.
  containerTight: { padding: space.md, gap: space.sm },
  label: { fontSize: type.small, fontWeight: "700", color: colors.muted, textTransform: "uppercase" },
  input: { minHeight: TOUCH, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: type.body, color: colors.text },
  chips: { flexDirection: "row", gap: space.sm },
  tiers: { flexDirection: "row", gap: space.sm },
  tiersTight: { gap: space.xs },
  tierCell: { flex: 1 },
  warn: { color: colors.warning, fontWeight: "600", textAlign: "center" },
  error: { color: colors.danger, fontSize: type.body, fontWeight: "600" },
});
