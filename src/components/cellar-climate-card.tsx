import { StyleSheet, Text, View } from "react-native";

import { GlassSurface } from "@/components/glass-surface";
import { Icon } from "@/components/icon";
import { Fonts, Palette, Radii } from "@/constants/theme";
import { useTuyaSensor } from "@/hooks/use-tuya-sensor";

function readingText(
  value: number | null | undefined,
  unit: string,
  decimals: number
): string {
  return value === null || value === undefined
    ? "—"
    : `${value.toFixed(decimals)}${unit}`;
}

export function CellarClimateCard() {
  const { linked, reading, loading, error } = useTuyaSensor();
  const isReading = linked && loading && !reading;

  return (
    <GlassSurface style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon color={Palette.white} name="thermometer" size={19} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Cellar climate</Text>
          <Text style={styles.subtitle}>
            {linked
              ? "Live from your Tuya sensor."
              : "Connect a Tuya sensor in Profile to see live readings."}
          </Text>
        </View>
        <View style={[styles.statusPill, linked && styles.statusPillLinked]}>
          <View style={[styles.statusDot, linked && styles.statusDotLinked]} />
          <Text style={[styles.statusText, linked && styles.statusTextLinked]}>
            {linked ? "Linked" : "Not linked"}
          </Text>
        </View>
      </View>

      {error ? <Text style={styles.currentError}>{error}</Text> : null}

      <View style={styles.rows}>
        <View style={styles.row}>
          <View style={styles.rowLabel}>
            <Icon color={Palette.plum} name="thermometer" size={16} />
            <Text style={styles.rowLabelText}>TEMPERATURE</Text>
          </View>
          <Text style={styles.rowValue}>
            {isReading ? "…" : readingText(reading?.temperatureC, "°C", 1)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <View style={styles.rowLabel}>
            <Icon color={Palette.plum} name="humidity" size={16} />
            <Text style={styles.rowLabelText}>HUMIDITY</Text>
          </View>
          <Text style={styles.rowValue}>
            {isReading ? "…" : readingText(reading?.humidityPct, "%", 0)}
          </Text>
        </View>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radii.card, marginTop: 20, padding: 18 },
  currentError: {
    color: Palette.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  divider: {
    backgroundColor: Palette.separator,
    height: StyleSheet.hairlineWidth,
  },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  headerCopy: { flex: 1 },
  headerIcon: {
    alignItems: "center",
    backgroundColor: Palette.wine,
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  rowLabel: { alignItems: "center", flexDirection: "row", gap: 7 },
  rowLabelText: {
    color: Palette.ink,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  rows: { gap: 10, marginTop: 16 },
  rowValue: {
    color: Palette.wineDark,
    fontFamily: Fonts.serif,
    fontSize: 17,
    fontWeight: "600",
    minWidth: 56,
    textAlign: "right",
  },
  statusDot: {
    backgroundColor: Palette.muted,
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  statusDotLinked: { backgroundColor: Palette.success },
  statusPill: {
    alignItems: "center",
    backgroundColor: Palette.surface,
    borderRadius: Radii.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillLinked: { backgroundColor: Palette.blush },
  statusText: {
    color: Palette.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  statusTextLinked: { color: Palette.wine },
  subtitle: {
    color: Palette.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  title: {
    color: Palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontWeight: "600",
  },
});
