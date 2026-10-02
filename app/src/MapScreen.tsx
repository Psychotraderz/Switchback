import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Camera, Map, UserLocation, type CameraRef } from "@maplibre/maplibre-react-native";
import * as Location from "expo-location";
import { DEFAULT_CENTER, DEFAULT_ZOOM, MAP_STYLE_URL } from "./config";

export default function MapScreen() {
  const camera = useRef<CameraRef>(null);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) =>
      setGranted(status === "granted"),
    );
  }, []);

  const locateMe = async () => {
    const pos = await Location.getCurrentPositionAsync({});
    camera.current?.flyTo({
      center: [pos.coords.longitude, pos.coords.latitude],
      zoom: 13,
      duration: 800,
    });
  };

  return (
    <View style={styles.container}>
      <Map style={styles.map} mapStyle={MAP_STYLE_URL}>
        <Camera ref={camera} initialViewState={{ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM }} />
        {granted && <UserLocation />}
      </Map>
      {granted && (
        <Pressable style={styles.button} onPress={locateMe} accessibilityLabel="Center on my location">
          <Text style={styles.buttonText}>Locate me</Text>
        </Pressable>
      )}
      <Text style={styles.attribution}>© OpenStreetMap contributors · OpenFreeMap</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  button: {
    position: "absolute",
    right: 16,
    bottom: 48,
    backgroundColor: "#1f5f3a",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  buttonText: { color: "white", fontWeight: "600" },
  attribution: {
    position: "absolute",
    left: 8,
    bottom: 8,
    fontSize: 10,
    color: "#333",
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 4,
  },
});
