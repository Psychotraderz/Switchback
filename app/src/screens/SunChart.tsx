import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme.ts";

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

interface Props {
  /** Exposure percent for hours 7..18. */
  values: number[];
  /** Local hours the planned hike covers, to highlight. */
  window?: [start: number, end: number];
}

/** Sun exposure by hour: tall amber = full sun, short blue = shade. */
export default function SunChart({ values, window }: Props) {
  return (
    <View accessible accessibilityLabel={`Sun exposure by hour: ${values.map((v, i) => `${HOURS[i]}:00 ${Math.round(v)} percent`).join(", ")}`}>
      <View style={styles.row}>
        {values.map((v, i) => {
          const inWindow = window && HOURS[i] + 1 > window[0] && HOURS[i] < window[1];
          return (
            <View key={HOURS[i]} style={styles.col}>
              <View style={[styles.track, inWindow && styles.trackOn]}>
                <View style={[styles.bar, { height: `${Math.max(4, v)}%`, backgroundColor: v > 50 ? colors.sun : colors.shade }]} />
              </View>
              <Text style={styles.tick}>{HOURS[i] > 12 ? HOURS[i] - 12 : HOURS[i]}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.legend}>Hour of day. Amber = sun, blue = shade. Outlined hours are when you'd be on trail.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 110 },
  col: { flex: 1, alignItems: "center", height: "100%", justifyContent: "flex-end" },
  track: { flex: 1, width: "100%", justifyContent: "flex-end", backgroundColor: "#efece2", borderRadius: 4, borderWidth: 1, borderColor: "transparent" },
  trackOn: { borderColor: colors.green },
  bar: { width: "100%", borderRadius: 3 },
  tick: { fontSize: 10, color: colors.muted, marginTop: 3 },
  legend: { fontSize: 11, color: colors.muted, marginTop: 6 },
});
