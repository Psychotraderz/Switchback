import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { fitScore } from "../core/fit.ts";
import type { UserProfile } from "../core/types.ts";
import { DEMO_TRAILS, type DemoTrail } from "../data/demoTrails.ts";
import { colors } from "../theme.ts";

interface Props {
  profile: UserProfile;
  onOpen: (t: DemoTrail) => void;
  onEditProfile: () => void;
}

export default function TrailsScreen({ profile, onOpen, onEditProfile }: Props) {
  const ranked = DEMO_TRAILS.map((t) => ({ t, fit: fitScore(t, profile) })).sort((a, b) => b.fit.score - a.fit.score);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Trails for you</Text>
      <Pressable onPress={onEditProfile} accessibilityRole="button">
        <Text style={styles.link}>Edit how I hike</Text>
      </Pressable>
      {ranked.map(({ t, fit }) => (
        <Pressable key={t.id} style={styles.card} onPress={() => onOpen(t)} accessibilityRole="button">
          <View style={styles.row}>
            <Text style={styles.name}>{t.name}</Text>
            <Text style={styles.score}>{fit.score}</Text>
          </View>
          <Text style={styles.label}>{fit.label}</Text>
          <Text style={styles.meta}>
            {(t.distance_m / 1000).toFixed(1)} km · {Math.round(t.gain_m)} m climb · {Math.round(t.sun_exposure_pct ?? 0)}% midday sun
          </Text>
        </Pressable>
      ))}
      <Text style={styles.muted}>Demo data for development.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 56, paddingBottom: 48 },
  h1: { fontSize: 26, fontWeight: "700", color: colors.text },
  link: { color: colors.green, fontWeight: "600", marginVertical: 8 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginTop: 10, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "700", color: colors.text, flex: 1, paddingRight: 8 },
  score: { fontSize: 20, fontWeight: "800", color: colors.green },
  label: { color: colors.green, fontWeight: "600", marginTop: 2 },
  meta: { color: colors.muted, marginTop: 4 },
  muted: { color: colors.muted, fontSize: 12, marginTop: 16 },
});
