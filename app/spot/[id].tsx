import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { da } from 'date-fns/locale';

import { Colors, SPOT_TYPES, WEATHER_CONDITIONS } from '@/lib/constants';
import { FishingSpot, Visit } from '@/lib/types';
import { getSpots, saveSpot, deleteSpot, getVisitsForSpot, deleteVisit } from '@/lib/storage';

export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [spot, setSpot] = useState<FishingSpot | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const spots = await getSpots();
    const found = spots.find((s) => s.id === id);
    if (found) {
      setSpot(found);
      const v = await getVisitsForSpot(found.id);
      setVisits(v);
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openEdit = () => {
    if (!spot) return;
    setEditName(spot.name);
    setEditDesc(spot.description ?? '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!spot || !editName.trim()) return;
    setSaving(true);
    const updated: FishingSpot = { ...spot, name: editName.trim(), description: editDesc.trim() || undefined };
    await saveSpot(updated);
    setSpot(updated);
    setSaving(false);
    setEditModalVisible(false);
  };

  const handleDeleteSpot = () => {
    if (!spot) return;
    Alert.alert(
      'Slet fiskeplads',
      `Vil du slette "${spot.name}"? Alle ${visits.length} ture for denne plads slettes også.`,
      [
        { text: 'Fortryd', style: 'cancel' },
        {
          text: 'Slet',
          style: 'destructive',
          onPress: async () => {
            await deleteSpot(spot.id);
            router.back();
          },
        },
      ],
    );
  };

  const handleDeleteVisit = (visit: Visit) => {
    Alert.alert('Slet tur', `Slet turen fra ${format(parseISO(visit.date), 'd. MMM yyyy', { locale: da })}?`, [
      { text: 'Fortryd', style: 'cancel' },
      {
        text: 'Slet',
        style: 'destructive',
        onPress: async () => {
          await deleteVisit(visit.id);
          await load();
        },
      },
    ]);
  };

  const spotTypeInfo = spot?.type
    ? SPOT_TYPES.find((t) => t.label === spot.type)
    : null;

  const condInfo = (cond?: string) => WEATHER_CONDITIONS.find((w) => w.value === cond);
  const totalCatches = visits.reduce((sum, v) => sum + v.catches.length, 0);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!spot) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Pladsen blev ikke fundet</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: spot.name,
          headerRight: () => (
            <TouchableOpacity onPress={openEdit} style={{ marginRight: 4 }}>
              <Ionicons name="create-outline" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Spot header card */}
        <View style={styles.headerCard}>
          <View style={styles.headerLeft}>
            {spotTypeInfo ? (
              <View style={styles.typeBadge}>
                <Text style={styles.typeEmoji}>{spotTypeInfo.emoji}</Text>
                <Text style={styles.typeLabel}>{spot.type}</Text>
              </View>
            ) : null}
            {spot.description ? (
              <Text style={styles.spotDesc}>{spot.description}</Text>
            ) : null}
            <Text style={styles.coordText}>
              {spot.latitude.toFixed(4)}° N, {spot.longitude.toFixed(4)}° Ø
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{visits.length}</Text>
            <Text style={styles.statLabel}>Ture</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalCatches}</Text>
            <Text style={styles.statLabel}>Fangster</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {visits.reduce((s, v) => s + v.photos.length + v.catches.filter((c) => c.photoUri).length, 0)}
            </Text>
            <Text style={styles.statLabel}>Billeder</Text>
          </View>
        </View>

        {/* Add trip button */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() =>
            router.push({ pathname: '/visit/[id]', params: { id: 'new', spotId: spot.id } })
          }
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.addBtnText}>Tilføj ny tur</Text>
        </TouchableOpacity>

        {/* Visits list */}
        <Text style={styles.sectionTitle}>Historik</Text>

        {visits.length === 0 ? (
          <View style={styles.emptyVisits}>
            <Text style={styles.emptyVisitsText}>Ingen ture registreret endnu</Text>
          </View>
        ) : (
          visits.map((visit) => {
            const cond = condInfo(visit.weather.condition);
            return (
              <TouchableOpacity
                key={visit.id}
                style={styles.visitCard}
                onPress={() => router.push(`/visit/${visit.id}`)}
                onLongPress={() => handleDeleteVisit(visit)}
                activeOpacity={0.75}
              >
                <View style={styles.visitLeft}>
                  <Text style={styles.visitDate}>
                    {format(parseISO(visit.date), 'EEEE d. MMMM yyyy', { locale: da })}
                  </Text>
                  {(visit.startTime || visit.endTime) ? (
                    <Text style={styles.visitTime}>
                      {visit.startTime ?? ''}
                      {visit.endTime ? ` – ${visit.endTime}` : ''}
                    </Text>
                  ) : null}
                  <View style={styles.visitMeta}>
                    {cond ? <Text>{cond.emoji}</Text> : null}
                    {visit.weather.temperature !== undefined ? (
                      <Text style={styles.visitMetaText}>{visit.weather.temperature}°C</Text>
                    ) : null}
                    {visit.weather.windSpeed !== undefined ? (
                      <Text style={styles.visitMetaText}>💨 {visit.weather.windSpeed} m/s</Text>
                    ) : null}
                  </View>
                  {visit.catches.length > 0 ? (
                    <View style={styles.catchRow}>
                      {visit.catches.map((c, i) => (
                        <View key={c.id} style={styles.catchChip}>
                          <Text style={styles.catchChipText}>
                            🐟 {c.species}
                            {c.weight ? ` ${c.weight}kg` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            );
          })
        )}

        {/* Delete spot */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteSpot}>
          <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          <Text style={styles.deleteBtnText}>Slet fiskeplads</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setEditModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Rediger plads</Text>

            <Text style={styles.label}>Navn</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />

            <Text style={styles.label}>Beskrivelse</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={editDesc}
              onChangeText={setEditDesc}
              placeholderTextColor={Colors.textMuted}
              placeholder="Valgfri beskrivelse"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.btnSecondaryText}>Annuller</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, (!editName.trim() || saving) && styles.btnDisabled]}
                onPress={handleSaveEdit}
                disabled={!editName.trim() || saving}
              >
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnPrimaryText}>Gem</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  errorText: { color: Colors.danger, fontSize: 16 },

  headerCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 12,
  },
  headerLeft: { flex: 1 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  typeEmoji: { fontSize: 20 },
  typeLabel: { color: Colors.textLight, fontSize: 15, fontWeight: '600' },
  spotDesc: { color: Colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  coordText: { color: Colors.textMuted, fontSize: 12 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
    overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue: { color: Colors.primary, fontSize: 24, fontWeight: '800' },
  statLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.cardBorder },

  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  addBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },

  emptyVisits: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
  },
  emptyVisitsText: { color: Colors.textMuted, fontSize: 15 },

  visitCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 8,
  },
  visitLeft: { flex: 1 },
  visitDate: { color: Colors.text, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  visitTime: { color: Colors.textMuted, fontSize: 13, marginBottom: 6 },
  visitMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  visitMetaText: { color: Colors.textMuted, fontSize: 13 },
  catchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catchChip: {
    backgroundColor: Colors.secondary + '22',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.secondary + '44',
  },
  catchChipText: { color: Colors.secondary, fontSize: 12, fontWeight: '600' },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.danger + '55',
  },
  deleteBtnText: { color: Colors.danger, fontSize: 15, fontWeight: '600' },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: Colors.cardBorder,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.separator,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { color: Colors.text, fontSize: 20, fontWeight: '700', marginBottom: 20 },
  label: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  inputMulti: { height: 80, paddingTop: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btnPrimary: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSecondary: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  btnSecondaryText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  btnDisabled: { opacity: 0.4 },
});
