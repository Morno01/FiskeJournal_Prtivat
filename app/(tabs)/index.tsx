import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { Marker, LongPressEvent } from 'react-native-maps';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, DENMARK_REGION, SPOT_TYPES } from '@/lib/constants';
import { FishingSpot, SpotType } from '@/lib/types';
import { getSpots, saveSpot, deleteSpot, generateId, getVisitsForSpot } from '@/lib/storage';

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [spots, setSpots] = useState<FishingSpot[]>([]);
  const [loading, setLoading] = useState(true);

  // Add spot modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingCoord, setPendingCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [newSpotName, setNewSpotName] = useState('');
  const [newSpotType, setNewSpotType] = useState<SpotType>('Hav');
  const [newSpotDesc, setNewSpotDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSpots = useCallback(async () => {
    setLoading(true);
    const data = await getSpots();
    setSpots(data);
    setLoading(false);
  }, []);

  useFocusEffect(loadSpots);

  const handleLongPress = (e: LongPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPendingCoord({ lat: latitude, lon: longitude });
    setNewSpotName('');
    setNewSpotType('Hav');
    setNewSpotDesc('');
    setModalVisible(true);
  };

  const handleSaveSpot = async () => {
    if (!pendingCoord || !newSpotName.trim()) return;
    setSaving(true);
    const spot: FishingSpot = {
      id: generateId(),
      name: newSpotName.trim(),
      latitude: pendingCoord.lat,
      longitude: pendingCoord.lon,
      type: newSpotType,
      description: newSpotDesc.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    await saveSpot(spot);
    await loadSpots();
    setSaving(false);
    setModalVisible(false);
  };

  const handleMarkerPress = (spot: FishingSpot) => {
    router.push(`/spot/${spot.id}`);
  };

  const handleDeleteSpot = async (spot: FishingSpot) => {
    const visits = await getVisitsForSpot(spot.id);
    const msg =
      visits.length > 0
        ? `Vil du slette "${spot.name}"? Dette fjerner også ${visits.length} tur(e).`
        : `Vil du slette "${spot.name}"?`;

    Alert.alert('Slet fiskeplads', msg, [
      { text: 'Fortryd', style: 'cancel' },
      {
        text: 'Slet',
        style: 'destructive',
        onPress: async () => {
          await deleteSpot(spot.id);
          await loadSpots();
        },
      },
    ]);
  };

  const centerDenmark = () => {
    mapRef.current?.animateToRegion(DENMARK_REGION, 600);
  };

  const spotTypeEmoji = (type?: SpotType) =>
    SPOT_TYPES.find((t) => t.label === type)?.emoji ?? '📍';

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DENMARK_REGION}
        onLongPress={handleLongPress}
        showsUserLocation
        showsCompass
        mapType="standard"
      >
        {spots.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
            onPress={() => handleMarkerPress(spot)}
            onCalloutPress={() => handleMarkerPress(spot)}
          >
            <View style={styles.markerContainer}>
              <Text style={styles.markerEmoji}>{spotTypeEmoji(spot.type)}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Top overlay */}
      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.appTitle}>🎣 FiskeJournal</Text>
            <Text style={styles.spotCount}>{spots.length} pladser</Text>
          </View>
          <TouchableOpacity style={styles.centerBtn} onPress={centerDenmark}>
            <Ionicons name="locate" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Bottom hint */}
      <View style={styles.hintContainer} pointerEvents="none">
        <View style={styles.hint}>
          <Ionicons name="hand-left-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.hintText}>Hold fingeren nede for at tilføje en plads</Text>
        </View>
      </View>

      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}

      {/* Add spot modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Ny fiskeplads</Text>

            <Text style={styles.label}>Navn *</Text>
            <TextInput
              style={styles.input}
              placeholder="F.eks. Aarøsund Havn"
              placeholderTextColor={Colors.textMuted}
              value={newSpotName}
              onChangeText={setNewSpotName}
              autoFocus
              returnKeyType="done"
            />

            <Text style={styles.label}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
              {SPOT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.label}
                  style={[styles.typeChip, newSpotType === t.label && styles.typeChipActive]}
                  onPress={() => setNewSpotType(t.label as SpotType)}
                >
                  <Text style={styles.typeChipText}>
                    {t.emoji} {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Beskrivelse (valgfri)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="F.eks. God plads til hornfisk om sommeren"
              placeholderTextColor={Colors.textMuted}
              value={newSpotDesc}
              onChangeText={setNewSpotDesc}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnSecondaryText}>Annuller</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, (!newSpotName.trim() || saving) && styles.btnDisabled]}
                onPress={handleSaveSpot}
                disabled={!newSpotName.trim() || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Gem plads</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: Colors.card + 'EE',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  topBarLeft: { flex: 1 },
  appTitle: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  spotCount: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
  centerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  markerEmoji: { fontSize: 18 },

  hintContainer: {
    position: 'absolute',
    bottom: 34,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card + 'DD',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
  },
  hintText: { color: Colors.textMuted, fontSize: 12 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,22,40,0.4)',
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
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
  modalTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
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
  inputMulti: { height: 72, paddingTop: 12 },
  typeRow: { marginBottom: 4 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.inputBg,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeChipText: { color: Colors.text, fontSize: 14 },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
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
