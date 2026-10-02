import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { fitScore } from "../core/fit.ts";
import { seasonForMonth } from "../core/heat.ts";
import { formatClock, planStart } from "../core/planner.ts";
import { baseMinutes } from "../core/time.ts";
import type { UserProfile } from "../core/types.ts";
import type { DemoTrail } from "../data/demoTrails.ts";
import { colors } from "../theme.ts";
import SunChart from "./SunChart.tsx";

const TYPICAL_HIGH: Record<string, number> = { summer: 40, equinox: 28, winter: 16 };

interface Props {
  trail: DemoTrail;
  profile: UserProfile;
  onBack: () => void;
}

const hm = (min: number) => `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, "0")}m`;

export default function TrailDetail({ trail, profile, onBack }: Props) {
  const month = new Date().getMonth() + 1;
  const season = seasonForMonth(month);
  const [highC, setHighC] = useState(TYPICAL_HIGH[season]);
  const fit = fitScore(trail, profile);
  const plan = planStart(trail, profile, { month, highC });
  const best = plan.best;
  const chart = trail.sun_profile?.[season];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} accessibilityRole="button">
        <Text style={styles.back}>‹ Trails</Text>
      </Pressable>
      <Text style={styles.h1}>{trail.name}</Text>
      <Text style={styles.sub}>{trail.blurb}</Text>

      <View style={styles.card}>
        <Text style={styles.fit}>{fit.label} for you · {fit.score}</Text>
        {fit.reasons.map((r) => (
          <Text key={r} style={styles.reason}>• {r}</Text>
        ))}
      </View>

      <View style={styles.stats}>
        <Stat label="Distance" value={`${(trail.distance_m / 1000).toFixed(1)} km`} />
        <Stat label="Climb" value={`${Math.round(trail.gain_m)} m`} />
        <Stat label="Your time" value={hm(baseMinutes(trail, profile.pace))} />
        <Stat label="Midday sun" value={`${Math.round(trail.sun_exposure_pct ?? 0)}%`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Best time to start</Text>
        <View style={styles.tempRow}>
          <Text style={styles.reason}>Forecast high</Text>
          <Pressable style={styles.step} onPress={() => setHighC(highC - 1)} accessibilityLabel="Lower temperature"><Text>−</Text></Pressable>
          <Text style={styles.temp}>{highC}°C ({Math.round((highC * 9) / 5 + 32)}°F)</Text>
          <Pressable style={styles.step} onPress={() => setHighC(highC + 1)} accessibilityLabel="Raise temperature"><Text>+</Text></Pressable>
        </View>
        <Text style={styles.big}>Start at {formatClock(best.startHour)}</Text>
        <Text style={styles.reason}>
          About {hm(best.durationMin)} on trail, peak {Math.round(best.peakTempC)}°C, roughly {best.waterLiters.toFixed(1)} L of water.
        </Text>
        {chart && <SunChart values={chart} window={[best.startHour, best.startHour + best.durationMin / 60]} />}
        {plan.warnings.map((w) => (
          <Text key={w} style={styles.warn}>⚠ {w}</Text>
        ))}
        {plan.alternatives.length > 0 && (
          <Text style={styles.muted}>Also workable: {plan.alternatives.map((a) => formatClock(a.startHour)).join(", ")}</Text>
        )}
        <Text style={styles.muted}>Estimates from a sun and terrain model. Conditions vary; carry extra water and know your limits.</Text>
      </View>
          </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 56, paddingBottom: 48 },
  back: { color: colors.green, fontWeight: "600", marginBottom: 8 },
  h1: { fontSize: 24, fontWeight: "700", color: colors.text },
  h2: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 6 },
  sub: { color: colors.muted, marginTop: 4, marginBottom: 12 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  fit: { fontSize: 18, fontWeight: "700", color: colors.green, marginBottom: 4 },
  reason: { color: colors.text, marginTop: 2, lineHeight: 20 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  stat: { flexGrow: 1, minWidth: "45%", backgroundColor: colors.card, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 18, fontWeight: "700", color: colors.text },
  statLabel: { color: colors.muted, fontSize: 12 },
  tempRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  step: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  temp: { fontWeight: "600", color: colors.text },
  big: { fontSize: 22, fontWeight: "800", color: colors.text, marginVertical: 4 },
  warn: { color: colors.warn, marginTop: 8, lineHeight: 20 },
  muted: { color: colors.muted, fontSize: 12, marginTop: 8, lineHeight: 17 },
});
