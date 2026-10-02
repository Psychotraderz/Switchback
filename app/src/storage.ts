import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseProfile } from "./core/profile.ts";
import type { UserProfile } from "./core/types.ts";

const KEY = "switchback.profile.v1";

export async function loadProfile(): Promise<UserProfile | null> {
  try {
    return parseProfile(await AsyncStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export async function saveProfile(p: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Storage can be unavailable; the app still works for this session.
  }
}
