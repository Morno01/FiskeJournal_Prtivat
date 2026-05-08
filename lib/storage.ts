import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { FishingSpot, Visit } from './types';

const SPOTS_KEY = '@fiske_spots';
const VISITS_KEY = '@fiske_visits';
const PHOTOS_DIR = `${FileSystem.documentDirectory}fiskejournal_photos/`;

async function ensurePhotosDir() {
  const info = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
}

// ── Spots ──────────────────────────────────────────────────────────────────

export async function getSpots(): Promise<FishingSpot[]> {
  try {
    const raw = await AsyncStorage.getItem(SPOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveSpot(spot: FishingSpot): Promise<void> {
  const spots = await getSpots();
  const idx = spots.findIndex((s) => s.id === spot.id);
  if (idx >= 0) {
    spots[idx] = spot;
  } else {
    spots.push(spot);
  }
  await AsyncStorage.setItem(SPOTS_KEY, JSON.stringify(spots));
}

export async function deleteSpot(id: string): Promise<void> {
  const spots = await getSpots();
  await AsyncStorage.setItem(SPOTS_KEY, JSON.stringify(spots.filter((s) => s.id !== id)));
  // Delete all visits for this spot
  const visits = await getVisits();
  const remaining = visits.filter((v) => v.spotId !== id);
  await AsyncStorage.setItem(VISITS_KEY, JSON.stringify(remaining));
}

// ── Visits ─────────────────────────────────────────────────────────────────

export async function getVisits(): Promise<Visit[]> {
  try {
    const raw = await AsyncStorage.getItem(VISITS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function getVisitsForSpot(spotId: string): Promise<Visit[]> {
  const all = await getVisits();
  return all.filter((v) => v.spotId === spotId).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getVisit(id: string): Promise<Visit | null> {
  const all = await getVisits();
  return all.find((v) => v.id === id) ?? null;
}

export async function saveVisit(visit: Visit): Promise<void> {
  const visits = await getVisits();
  const idx = visits.findIndex((v) => v.id === visit.id);
  if (idx >= 0) {
    visits[idx] = visit;
  } else {
    visits.push(visit);
  }
  await AsyncStorage.setItem(VISITS_KEY, JSON.stringify(visits));
}

export async function deleteVisit(id: string): Promise<void> {
  const visits = await getVisits();
  const visit = visits.find((v) => v.id === id);
  if (visit) {
    // Clean up all photo files
    for (const photo of visit.photos) {
      await FileSystem.deleteAsync(photo.uri, { idempotent: true });
    }
    for (const c of visit.catches) {
      if (c.photoUri) {
        await FileSystem.deleteAsync(c.photoUri, { idempotent: true });
      }
    }
  }
  await AsyncStorage.setItem(VISITS_KEY, JSON.stringify(visits.filter((v) => v.id !== id)));
}

// ── Photo storage ──────────────────────────────────────────────────────────

export async function copyPhotoToStorage(sourceUri: string): Promise<string> {
  await ensurePhotosDir();
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const dest = PHOTOS_DIR + filename;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

// ── Utils ──────────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
