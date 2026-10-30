import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { friendlyError } from "../lib/errors";
import { ExportRange, shareDatabaseBackup, shareExpensesCsv, shareSalesCsv } from "../lib/exporter";
import { plural } from "../lib/format";
import { importCsv } from "../lib/importer";
import { Button, Card, Segmented } from "../ui/components";
import { Palette, space, type } from "../ui/theme";
import { useStyles } from "../ui/ThemeContext";

type Job = "sales" | "expenses" | "import" | "backup";

// Share sales or expenses as a spreadsheet file, bring a shared file back in, or make a full backup.
export default function ExportCard() {
  const s = useStyles(makeStyles);
  const [range, setRange] = useState<ExportRange>("month");
  const [busy, setBusy] = useState<Job | null>(null);
  const [result, setResult] = useState<{ text: string; ok: boolean } | null>(null);

  async function run(job: Job, work: () => Promise<string>) {
    if (busy) return;
    setBusy(job);
    setResult(null);
    try {
      setResult({ text: await work(), ok: true });
    } catch (e) {
      setResult({ text: friendlyError(e).message, ok: false });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <Text style={s.title} accessibilityRole="header">
        Export, import and backup
      </Text>
      <Text style={s.muted}>Send your records to a spreadsheet, load a shared CSV back in, or keep a copy of everything on this phone.</Text>
      <Segmented
        options={[
          ["month", "This month"],
          ["all", "All time"],
        ]}
        value={range}
        onChange={setRange}
      />
      <Button
        title="Share sales (CSV)"
        icon="share-outline"
        variant="secondary"
        loading={busy === "sales"}
        disabled={busy !== null}
        onPress={() => run("sales", async () => `Shared ${plural(await shareSalesCsv(range), "sale")}.`)}
      />
      <Button
        title="Share expenses (CSV)"
        icon="share-outline"
        variant="secondary"
        loading={busy === "expenses"}
        disabled={busy !== null}
        onPress={() => run("expenses", async () => `Shared ${plural(await shareExpensesCsv(range), "expense")}.`)}
      />
      <Button
        title="Import from CSV"
        icon="download-outline"
        variant="secondary"
        loading={busy === "import"}
        disabled={busy !== null}
        onPress={() =>
          run("import", async () => {
            const r = await importCsv();
            if (!r) return "No file chosen.";
            const added = r.sales ? plural(r.sales, "sale") : plural(r.expenses, "expense");
            return `Imported ${added}.${r.skipped ? ` Skipped ${r.skipped} (already stored or unreadable).` : ""}`;
          })
        }
      />
      <Button
        title="Back up all data"
        icon="save-outline"
        variant="secondary"
        loading={busy === "backup"}
        disabled={busy !== null}
        onPress={() =>
          run("backup", async () => {
            await shareDatabaseBackup();
            return "Backup shared. Keep that file private: it holds all your sales and clients.";
          })
        }
      />
      {result && (
        <Text style={result.ok ? s.ok : s.error} accessibilityRole="alert">
          {result.text}
        </Text>
      )}
    </Card>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  title: { fontSize: type.title, fontWeight: "700", color: colors.text },
  muted: { fontSize: type.small, color: colors.muted, marginBottom: space.xs },
  ok: { fontSize: type.small, color: colors.success, fontWeight: "600" },
  error: { fontSize: type.small, color: colors.danger, fontWeight: "600" },
});
