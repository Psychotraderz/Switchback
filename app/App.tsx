import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { UserProfile } from "./src/core/types.ts";
import type { DemoTrail } from "./src/data/demoTrails.ts";
import MapScreen from "./src/MapScreen";
import Onboarding from "./src/screens/Onboarding.tsx";
import TrailDetail from "./src/screens/TrailDetail.tsx";
import TrailsScreen from "./src/screens/TrailsScreen.tsx";
import { loadProfile, saveProfile } from "./src/storage.ts";
import { colors } from "./src/theme.ts";

type Tab = "map" | "trails";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>("trails");
  const [open, setOpen] = useState<DemoTrail | null>(null);

  useEffect(() => {
    loadProfile().then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  if (!profile || editing) {
    return (
      <>
        <Onboarding
          initial={profile ?? undefined}
          onDone={(p) => {
            setProfile(p);
            setEditing(false);
            void saveProfile(p);
          }}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.body}>
        {tab === "map" ? (
          <MapScreen />
        ) : open ? (
          <TrailDetail trail={open} profile={profile} onBack={() => setOpen(null)} />
        ) : (
          <TrailsScreen profile={profile} onOpen={setOpen} onEditProfile={() => setEditing(true)} />
        )}
      </View>
      <View style={styles.tabs}>
        {(["trails", "map"] as Tab[]).map((t) => (
          <Pressable key={t} style={styles.tab} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
            <Text style={[styles.tabText, tab === t && styles.tabOn]}>{t === "trails" ? "Trails" : "Map"}</Text>
          </Pressable>
        ))}
      </View>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  tabs: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: 18 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabText: { color: colors.muted, fontWeight: "600" },
  tabOn: { color: colors.green },
});
