import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { da } from 'date-fns/locale';

import { Colors, WEATHER_CONDITIONS } from '@/lib/constants';
import { Visit, FishingSpot } from '@/lib/types';
import { getVisits, getSpots } from '@/lib/storage';

interface TripRow {
  visit: Visit;
  spot: FishingSpot | undefined;
}

export default function TripsScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<TripRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [visits, spots] = await Promise.all([getVisits(), getSpots()]);
    const spotsMap = new Map(spots.map((s) => [s.id, s]));
    const sorted = [...visits].sort((a, b) => b.date.localeCompare(a.date));
    setRows(sorted.map((v) => ({ visit: v, spot: spotsMap.get(v.spotId) })));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const conditionInfo = (condition?: string) =>
    WEATHER_CONDITIONS.find((w) => w.value === condition);

  const renderItem = ({ item }: { item: TripRow }) => {
    const { visit, spot } = item;
    const dateStr = format(parseISO(visit.date), 'd. MMMM yyyy', { locale: da });
    const cond = conditionInfo(visit.weather.condition);
    const catchCount = visit.catches.length;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/visit/${visit.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.spotName}>{spot?.name ?? 'Ukendt plads'}</Text>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.dateText}>{dateStr}</Text>
            {visit.startTime ? (
              <Text style={styles.timeText}>
                {visit.startTime}
                {visit.endTime ? `–${visit.endTime}` : ''}
              </Text>
            ) : null}
          </View>
          <View style={styles.metaRow}>
            {cond ? <Text style={styles.condEmoji}>{cond.emoji}</Text> : null}
            {visit.weather.temperature !== undefined ? (
              <Text style={styles.metaText}>{visit.weather.temperature}°C</Text>
            ) : null}
            {visit.weather.windSpeed !== undefined ? (
              <Text style={styles.metaText}>💨 {visit.weather.windSpeed} m/s</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.cardRight}>
          {catchCount > 0 ? (
            <View style={styles.catchBadge}>
              <Text style={styles.catchBadgeEmoji}>🐟</Text>
              <Text style={styles.catchBadgeCount}>{catchCount}</Text>
            </View>
          ) : (
            <View style={styles.catchBadgeEmpty}>
              <Text style={styles.catchBadgeEmoji}>🎣</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginTop: 6 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🗺️</Text>
          <Text style={styles.emptyTitle}>Ingen ture endnu</Text>
          <Text style={styles.emptyText}>
            Tilføj fiskepladser på kortet og log dine ture
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.visit.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 32 },
  separator: { height: 10 },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'center', marginLeft: 12 },

  spotName: { color: Colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  dateText: { color: Colors.textLight, fontSize: 13 },
  timeText: { color: Colors.textMuted, fontSize: 13 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  condEmoji: { fontSize: 16 },
  metaText: { color: Colors.textMuted, fontSize: 13 },

  catchBadge: {
    backgroundColor: Colors.secondary + '22',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.secondary + '55',
    minWidth: 48,
  },
  catchBadgeEmpty: {
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 48,
  },
  catchBadgeEmoji: { fontSize: 18 },
  catchBadgeCount: { color: Colors.secondary, fontSize: 13, fontWeight: '700' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { color: Colors.text, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: Colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
