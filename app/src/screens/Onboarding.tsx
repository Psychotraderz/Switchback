import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { DEFAULT_PROFILE, QUIZ } from "../core/profile.ts";
import type { UserProfile } from "../core/types.ts";
import { colors } from "../theme.ts";

interface Props {
  initial?: UserProfile;
  onDone: (p: UserProfile) => void;
}

export default function Onboarding({ initial, onDone }: Props) {
  const [profile, setProfile] = useState<UserProfile>(initial ?? DEFAULT_PROFILE);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Tell us how you hike</Text>
      <Text style={styles.sub}>Switchback uses this to size up every trail for you, not for an average hiker. You can change it any time.</Text>
      {QUIZ.map((q) => (
        <View key={q.key} style={styles.block}>
          <Text style={styles.q}>{q.title}</Text>
          {q.options.map((o) => {
            const selected = profile[q.key] === o.value;
            return (
              <Pressable
                key={String(o.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.option, selected && styles.optionOn]}
                onPress={() => setProfile({ ...profile, [q.key]: o.value })}
              >
                <Text style={[styles.optionText, selected && styles.optionTextOn]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      <Pressable style={styles.cta} onPress={() => onDone(profile)} accessibilityRole="button">
        <Text style={styles.ctaText}>Save and find trails</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 56, paddingBottom: 48 },
  h1: { fontSize: 26, fontWeight: "700", color: colors.text },
  sub: { color: colors.muted, marginTop: 6, marginBottom: 12, lineHeight: 20 },
  block: { marginTop: 18 },
  q: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 8 },
  option: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 8 },
  optionOn: { borderColor: colors.green, backgroundColor: "#e6f1ea" },
  optionText: { color: colors.text },
  optionTextOn: { fontWeight: "600", color: colors.green },
  cta: { backgroundColor: colors.green, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 28 },
  ctaText: { color: "white", fontWeight: "700", fontSize: 16 },
});
