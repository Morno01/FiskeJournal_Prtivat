import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  Pressable,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { da } from 'date-fns/locale';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/lib/constants';
import { Visit, FishingSpot, Photo, Catch } from '@/lib/types';
import { getVisits, getSpots } from '@/lib/storage';

interface GalleryItem {
  photo: Photo | null;
  catchItem: Catch | null;
  visit: Visit;
  spot: FishingSpot | undefined;
  uri: string;
  time?: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const COL = 3;
const CELL_SIZE = (SCREEN_WIDTH - 4) / COL;

export default function GalleryScreen() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selected, setSelected] = useState<GalleryItem | null>(null);

  const load = useCallback(async () => {
    const [visits, spots] = await Promise.all([getVisits(), getSpots()]);
    const spotsMap = new Map(spots.map((s) => [s.id, s]));
    const all: GalleryItem[] = [];

    for (const visit of visits) {
      const spot = spotsMap.get(visit.spotId);

      // Standalone visit photos
      for (const photo of visit.photos) {
        if (photo.uri) {
          all.push({ photo, catchItem: null, visit, spot, uri: photo.uri, time: photo.timestamp });
        }
      }
      // Catch photos
      for (const c of visit.catches) {
        if (c.photoUri) {
          all.push({ photo: null, catchItem: c, visit, spot, uri: c.photoUri, time: c.time });
        }
      }
    }

    // Sort newest first
    all.sort((a, b) => {
      const aDate = a.time ?? a.visit.date;
      const bDate = b.time ?? b.visit.date;
      return bDate.localeCompare(aDate);
    });

    setItems(all);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const renderCell = ({ item }: { item: GalleryItem }) => (
    <TouchableOpacity style={styles.cell} onPress={() => setSelected(item)} activeOpacity={0.85}>
      <Image source={{ uri: item.uri }} style={styles.cellImage} resizeMode="cover" />
      {item.catchItem ? (
        <View style={styles.cellBadge}>
          <Text style={styles.cellBadgeText}>🐟</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📸</Text>
          <Text style={styles.emptyTitle}>Ingen billeder endnu</Text>
          <Text style={styles.emptyText}>
            Tilføj billeder til dine fangster og ture
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.countText}>{items.length} billeder</Text>
          <FlatList
            data={items}
            keyExtractor={(item, i) => item.uri + i}
            renderItem={renderCell}
            numColumns={COL}
            contentContainerStyle={styles.grid}
          />
        </>
      )}

      {/* Full screen viewer */}
      <Modal visible={!!selected} animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.viewer}>
          <SafeAreaView edges={['top']} style={styles.viewerHeader}>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>

          {selected ? (
            <>
              <Image
                source={{ uri: selected.uri }}
                style={styles.fullImage}
                resizeMode="contain"
              />
              <View style={styles.viewerMeta}>
                <Text style={styles.viewerSpot}>
                  📍 {selected.spot?.name ?? 'Ukendt plads'}
                </Text>
                <Text style={styles.viewerDate}>
                  {format(parseISO(selected.visit.date), 'd. MMMM yyyy', { locale: da })}
                </Text>
                {selected.catchItem ? (
                  <View style={styles.viewerCatch}>
                    <Text style={styles.viewerCatchTitle}>🐟 {selected.catchItem.species}</Text>
                    {selected.catchItem.weight ? (
                      <Text style={styles.viewerCatchDetail}>
                        {selected.catchItem.weight} kg
                        {selected.catchItem.length ? ` · ${selected.catchItem.length} cm` : ''}
                      </Text>
                    ) : null}
                    {selected.catchItem.time ? (
                      <Text style={styles.viewerCatchDetail}>
                        Kl. {selected.catchItem.time.length > 5
                          ? format(new Date(selected.catchItem.time), 'HH:mm')
                          : selected.catchItem.time}
                      </Text>
                    ) : null}
                    {selected.catchItem.released ? (
                      <Text style={styles.viewerReleased}>Genudsat 🔄</Text>
                    ) : null}
                  </View>
                ) : selected.photo?.description ? (
                  <Text style={styles.viewerDesc}>{selected.photo.description}</Text>
                ) : null}
              </View>
            </>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  countText: {
    color: Colors.textMuted,
    fontSize: 13,
    padding: 12,
    paddingBottom: 4,
  },
  grid: { gap: 2 },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: 1,
    backgroundColor: Colors.card,
  },
  cellImage: { width: '100%', height: '100%' },
  cellBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  cellBadgeText: { fontSize: 12 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { color: Colors.text, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: Colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 },

  // Viewer
  viewer: { flex: 1, backgroundColor: '#000' },
  viewerHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
  },
  fullImage: { flex: 1, width: '100%' },
  viewerMeta: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: 20,
    paddingBottom: 40,
  },
  viewerSpot: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  viewerDate: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 10 },
  viewerCatch: {},
  viewerCatchTitle: { color: Colors.accent, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  viewerCatchDetail: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  viewerReleased: { color: Colors.secondary, fontSize: 13, marginTop: 4 },
  viewerDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
});
