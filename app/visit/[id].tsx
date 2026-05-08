import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
  Switch,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { da } from 'date-fns/locale';

import { Colors, WEATHER_CONDITIONS, WIND_DIRECTIONS, TIDE_STATES, PRESSURE_TRENDS, FISH_SPECIES } from '@/lib/constants';
import { Visit, WeatherData, Catch, Photo, WeatherCondition, WindDirection, TideState, PressureTrend } from '@/lib/types';
import { getVisit, getSpots, saveVisit, generateId, copyPhotoToStorage } from '@/lib/storage';
import { fetchWeatherFromYr, getMoonInfo, msToBeaufort, beaufortLabel } from '@/lib/weather';
import { FishingSpot } from '@/lib/types';

export default function VisitScreen() {
  const { id, spotId: spotIdParam } = useLocalSearchParams<{ id: string; spotId?: string }>();
  const router = useRouter();
  const isNew = id === 'new';

  const [spot, setSpot] = useState<FishingSpot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingWeather, setFetchingWeather] = useState(false);

  // Form state
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [weather, setWeather] = useState<WeatherData>({});
  const [catches, setCatches] = useState<Catch[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [notes, setNotes] = useState('');
  const [visitId] = useState(() => (isNew ? generateId() : id));

  // Catch modal state
  const [catchModalVisible, setCatchModalVisible] = useState(false);
  const [editingCatch, setEditingCatch] = useState<Catch | null>(null);
  const [catchSpecies, setCatchSpecies] = useState('');
  const [catchWeight, setCatchWeight] = useState('');
  const [catchLength, setCatchLength] = useState('');
  const [catchTimeH, setCatchTimeH] = useState('');
  const [catchTimeM, setCatchTimeM] = useState('');
  const [catchNotes, setCatchNotes] = useState('');
  const [catchReleased, setCatchReleased] = useState(false);
  const [catchPhotoUri, setCatchPhotoUri] = useState('');
  const [showSpeciesList, setShowSpeciesList] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const spots = await getSpots();

    if (isNew) {
      const sId = spotIdParam;
      const s = spots.find((sp) => sp.id === sId) ?? null;
      setSpot(s);
      // Pre-fill moon phase for today
      const moon = getMoonInfo(new Date());
      setWeather((w) => ({ ...w, moonPhase: moon.phase, moonEmoji: moon.emoji, moonIllumination: moon.illumination }));
    } else {
      const visit = await getVisit(id);
      if (visit) {
        setDate(parseISO(visit.date));
        setStartTime(visit.startTime ?? '');
        setEndTime(visit.endTime ?? '');
        setWeather(visit.weather);
        setCatches(visit.catches);
        setPhotos(visit.photos);
        setNotes(visit.notes ?? '');
        const s = spots.find((sp) => sp.id === visit.spotId) ?? null;
        setSpot(s);
      }
    }
    setLoading(false);
  };

  const handleFetchWeather = async () => {
    if (!spot) return;
    setFetchingWeather(true);
    try {
      const wd = await fetchWeatherFromYr(spot.latitude, spot.longitude, date);
      const moon = getMoonInfo(date);
      setWeather({
        ...wd,
        moonPhase: moon.phase,
        moonEmoji: moon.emoji,
        moonIllumination: moon.illumination,
      });
      Alert.alert('Vejr hentet', `Data fra yr.no (${format(date, 'd. MMM', { locale: da })})`);
    } catch (err: any) {
      Alert.alert('Fejl', err.message ?? 'Kunne ikke hente vejrdata. Tjek din internetforbindelse.');
    } finally {
      setFetchingWeather(false);
    }
  };

  const handleSave = async () => {
    if (!spot) return;
    setSaving(true);
    const visit: Visit = {
      id: visitId,
      spotId: spot.id,
      date: format(date, 'yyyy-MM-dd'),
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      weather,
      catches,
      photos,
      notes: notes || undefined,
    };
    await saveVisit(visit);
    setSaving(false);
    router.back();
  };

  // ── Photo handling ─────────────────────────────────────────────────────────

  const pickVisitPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = await copyPhotoToStorage(result.assets[0].uri);
      const photo: Photo = {
        id: generateId(),
        uri,
        timestamp: new Date().toISOString(),
      };
      setPhotos((prev) => [...prev, photo]);
    }
  };

  const pickVisitPhotoCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      const uri = await copyPhotoToStorage(result.assets[0].uri);
      const photo: Photo = {
        id: generateId(),
        uri,
        timestamp: new Date().toISOString(),
      };
      setPhotos((prev) => [...prev, photo]);
    }
  };

  const removePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  // ── Catch modal ────────────────────────────────────────────────────────────

  const openAddCatch = () => {
    setEditingCatch(null);
    setCatchSpecies('');
    setCatchWeight('');
    setCatchLength('');
    const now = new Date();
    setCatchTimeH(String(now.getHours()).padStart(2, '0'));
    setCatchTimeM(String(now.getMinutes()).padStart(2, '0'));
    setCatchNotes('');
    setCatchReleased(false);
    setCatchPhotoUri('');
    setCatchModalVisible(true);
  };

  const openEditCatch = (c: Catch) => {
    setEditingCatch(c);
    setCatchSpecies(c.species);
    setCatchWeight(c.weight !== undefined ? String(c.weight) : '');
    setCatchLength(c.length !== undefined ? String(c.length) : '');
    const t = c.time.length === 5 ? c.time : format(new Date(c.time), 'HH:mm');
    const [h, m] = t.split(':');
    setCatchTimeH(h ?? '');
    setCatchTimeM(m ?? '');
    setCatchNotes(c.notes ?? '');
    setCatchReleased(c.released);
    setCatchPhotoUri(c.photoUri ?? '');
    setCatchModalVisible(true);
  };

  const pickCatchPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    Alert.alert(
      'Fangstbillede',
      'Vælg kilde',
      [
        {
          text: 'Kamera',
          onPress: async () => {
            const r = await ImagePicker.launchCameraAsync({ quality: 0.85 });
            if (!r.canceled && r.assets[0]) {
              const uri = await copyPhotoToStorage(r.assets[0].uri);
              setCatchPhotoUri(uri);
            }
          },
        },
        {
          text: 'Fotobibliotek',
          onPress: async () => {
            const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, mediaTypes: ImagePicker.MediaTypeOptions.Images });
            if (!r.canceled && r.assets[0]) {
              const uri = await copyPhotoToStorage(r.assets[0].uri);
              setCatchPhotoUri(uri);
            }
          },
        },
        { text: 'Annuller', style: 'cancel' },
      ],
    );
  };

  const saveCatch = () => {
    if (!catchSpecies.trim()) return;
    const timeStr = `${catchTimeH.padStart(2, '0')}:${catchTimeM.padStart(2, '0')}`;
    const newCatch: Catch = {
      id: editingCatch?.id ?? generateId(),
      species: catchSpecies.trim(),
      weight: catchWeight ? parseFloat(catchWeight) : undefined,
      length: catchLength ? parseFloat(catchLength) : undefined,
      time: timeStr,
      notes: catchNotes || undefined,
      released: catchReleased,
      photoUri: catchPhotoUri || undefined,
    };
    if (editingCatch) {
      setCatches((prev) => prev.map((c) => (c.id === editingCatch.id ? newCatch : c)));
    } else {
      setCatches((prev) => [...prev, newCatch]);
    }
    setCatchModalVisible(false);
  };

  const deleteCatch = (catchId: string) => {
    Alert.alert('Slet fangst', 'Vil du slette denne fangst?', [
      { text: 'Fortryd', style: 'cancel' },
      { text: 'Slet', style: 'destructive', onPress: () => setCatches((prev) => prev.filter((c) => c.id !== catchId)) },
    ]);
  };

  // ── Weather helpers ────────────────────────────────────────────────────────

  const setWx = (updates: Partial<WeatherData>) => setWeather((w) => ({ ...w, ...updates }));

  const beaufort = weather.windSpeed !== undefined ? msToBeaufort(weather.windSpeed) : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isNew ? 'Ny tur' : format(date, 'd. MMM yyyy', { locale: da }),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !spot}
              style={[styles.saveBtn, (saving || !spot) && styles.btnDisabled]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Gem</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Spot indicator */}
        {spot ? (
          <View style={styles.spotBanner}>
            <Ionicons name="location" size={16} color={Colors.accent} />
            <Text style={styles.spotBannerText}>{spot.name}</Text>
          </View>
        ) : null}

        {/* ── DATE & TIME ──────────────────────────────────────────────── */}
        <Section title="Dato & Tid">
          <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar" size={20} color={Colors.primary} />
            <Text style={styles.dateText}>
              {format(date, 'EEEE d. MMMM yyyy', { locale: da })}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              locale="da"
              onChange={(_, d) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (d) {
                  setDate(d);
                  const moon = getMoonInfo(d);
                  setWx({ moonPhase: moon.phase, moonEmoji: moon.emoji, moonIllumination: moon.illumination });
                }
              }}
              textColor={Colors.text}
            />
          )}
          {Platform.OS === 'ios' && showDatePicker && (
            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.doneBtnText}>Færdig</Text>
            </TouchableOpacity>
          )}

          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Fra</Text>
              <View style={styles.timeInputRow}>
                <TextInput
                  style={styles.timeInput}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="08:00"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
            </View>
            <Text style={styles.timeSep}>–</Text>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Til</Text>
              <TextInput
                style={styles.timeInput}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="16:00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          </View>
        </Section>

        {/* ── WEATHER ─────────────────────────────────────────────────── */}
        <Section
          title="Vejr & Forhold"
          action={
            <TouchableOpacity
              style={styles.fetchBtn}
              onPress={handleFetchWeather}
              disabled={fetchingWeather}
            >
              {fetchingWeather ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={15} color={Colors.primary} />
                  <Text style={styles.fetchBtnText}>Hent fra yr.no</Text>
                </>
              )}
            </TouchableOpacity>
          }
        >
          {/* Condition picker */}
          <Text style={styles.fieldLabel}>Vejrforhold</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {WEATHER_CONDITIONS.map((w) => (
              <TouchableOpacity
                key={w.value}
                style={[styles.condChip, weather.condition === w.value && styles.condChipActive]}
                onPress={() => setWx({ condition: w.value as WeatherCondition })}
              >
                <Text style={styles.condEmoji}>{w.emoji}</Text>
                <Text style={[styles.condLabel, weather.condition === w.value && styles.condLabelActive]}>
                  {w.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Temperature row */}
          <View style={styles.row2}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Lufttemperatur (°C)</Text>
              <TextInput
                style={styles.input}
                value={weather.temperature !== undefined ? String(weather.temperature) : ''}
                onChangeText={(v) => setWx({ temperature: v ? parseFloat(v) : undefined })}
                placeholder="f.eks. 12"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Vandtemperatur (°C)</Text>
              <TextInput
                style={styles.input}
                value={weather.waterTemperature !== undefined ? String(weather.waterTemperature) : ''}
                onChangeText={(v) => setWx({ waterTemperature: v ? parseFloat(v) : undefined })}
                placeholder="f.eks. 8"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          {/* Wind */}
          <View style={styles.row2}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Vindstyrke (m/s)</Text>
              <TextInput
                style={styles.input}
                value={weather.windSpeed !== undefined ? String(weather.windSpeed) : ''}
                onChangeText={(v) => setWx({ windSpeed: v ? parseFloat(v) : undefined })}
                placeholder="f.eks. 5"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numbers-and-punctuation"
              />
              {beaufort !== null ? (
                <Text style={styles.subText}>Beaufort {beaufort} – {beaufortLabel(beaufort)}</Text>
              ) : null}
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Vindretning</Text>
              <ScrollView style={{ maxHeight: 120 }}>
                {WIND_DIRECTIONS.map((dir) => (
                  <TouchableOpacity
                    key={dir}
                    style={[styles.windChip, weather.windDirection === dir && styles.windChipActive]}
                    onPress={() => setWx({ windDirection: dir as WindDirection })}
                  >
                    <Text style={[styles.windChipText, weather.windDirection === dir && styles.windChipTextActive]}>
                      {dir}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Pressure */}
          <Text style={styles.fieldLabel}>Lufttryk (hPa)</Text>
          <TextInput
            style={styles.input}
            value={weather.pressure !== undefined ? String(weather.pressure) : ''}
            onChangeText={(v) => setWx({ pressure: v ? parseInt(v) : undefined })}
            placeholder="f.eks. 1013"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
          />

          <Text style={styles.fieldLabel}>Lufttrykstrend</Text>
          <View style={styles.chipRow}>
            {PRESSURE_TRENDS.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[styles.optChip, weather.pressureTrend === p.value && styles.optChipActive]}
                onPress={() => setWx({ pressureTrend: p.value as PressureTrend })}
              >
                <Text style={styles.optChipText}>{p.emoji} {p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tide */}
          <Text style={styles.fieldLabel}>Tidevand</Text>
          <View style={styles.chipRow}>
            {TIDE_STATES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.optChip, weather.tideState === t.value && styles.optChipActive]}
                onPress={() => setWx({ tideState: t.value as TideState })}
              >
                <Text style={styles.optChipText}>{t.emoji} {t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Humidity */}
          <View style={styles.row2}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Luftfugtighed (%)</Text>
              <TextInput
                style={styles.input}
                value={weather.humidity !== undefined ? String(weather.humidity) : ''}
                onChangeText={(v) => setWx({ humidity: v ? parseInt(v) : undefined })}
                placeholder="f.eks. 75"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Sigtbarhed (km)</Text>
              <TextInput
                style={styles.input}
                value={weather.visibility !== undefined ? String(weather.visibility) : ''}
                onChangeText={(v) => setWx({ visibility: v ? parseFloat(v) : undefined })}
                placeholder="f.eks. 10"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          {/* Moon phase */}
          <View style={styles.moonRow}>
            <Text style={styles.moonEmoji}>{weather.moonEmoji ?? '🌙'}</Text>
            <View>
              <Text style={styles.moonPhase}>{weather.moonPhase ?? 'Ukendt månefase'}</Text>
              {weather.moonIllumination !== undefined ? (
                <Text style={styles.moonIll}>{weather.moonIllumination}% belyst</Text>
              ) : null}
            </View>
          </View>

          {weather.fetchedAt ? (
            <Text style={styles.fetchedAt}>
              Hentet fra yr.no kl. {format(new Date(weather.fetchedAt), 'HH:mm')}
            </Text>
          ) : null}
        </Section>

        {/* ── CATCHES ─────────────────────────────────────────────────── */}
        <Section
          title={`Fangster (${catches.length})`}
          action={
            <TouchableOpacity style={styles.addIconBtn} onPress={openAddCatch}>
              <Ionicons name="add" size={22} color={Colors.primary} />
            </TouchableOpacity>
          }
        >
          {catches.length === 0 ? (
            <TouchableOpacity style={styles.addCatchEmpty} onPress={openAddCatch}>
              <Text style={styles.addCatchEmptyText}>+ Tilføj fangst</Text>
            </TouchableOpacity>
          ) : (
            catches.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.catchCard}
                onPress={() => openEditCatch(c)}
                onLongPress={() => deleteCatch(c.id)}
                activeOpacity={0.75}
              >
                <View style={styles.catchCardLeft}>
                  {c.photoUri ? (
                    <Image source={{ uri: c.photoUri }} style={styles.catchThumb} />
                  ) : (
                    <View style={styles.catchThumbPlaceholder}>
                      <Text style={{ fontSize: 24 }}>🐟</Text>
                    </View>
                  )}
                  <View style={styles.catchCardInfo}>
                    <Text style={styles.catchSpecies}>{c.species}</Text>
                    <View style={styles.catchMeta}>
                      {c.weight ? <Text style={styles.catchMetaText}>{c.weight} kg</Text> : null}
                      {c.length ? <Text style={styles.catchMetaText}>{c.length} cm</Text> : null}
                      <Text style={styles.catchMetaText}>kl. {c.time}</Text>
                    </View>
                    {c.released ? (
                      <Text style={styles.releasedTag}>Genudsat 🔄</Text>
                    ) : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </Section>

        {/* ── PHOTOS ──────────────────────────────────────────────────── */}
        <Section
          title={`Billeder (${photos.length})`}
          action={
            <TouchableOpacity
              style={styles.addIconBtn}
              onPress={() =>
                Alert.alert('Tilføj billede', '', [
                  { text: 'Kamera', onPress: pickVisitPhotoCamera },
                  { text: 'Fotobibliotek', onPress: pickVisitPhoto },
                  { text: 'Annuller', style: 'cancel' },
                ])
              }
            >
              <Ionicons name="camera" size={20} color={Colors.primary} />
            </TouchableOpacity>
          }
        >
          {photos.length === 0 ? (
            <TouchableOpacity
              style={styles.addCatchEmpty}
              onPress={() =>
                Alert.alert('Tilføj billede', '', [
                  { text: 'Kamera', onPress: pickVisitPhotoCamera },
                  { text: 'Fotobibliotek', onPress: pickVisitPhoto },
                  { text: 'Annuller', style: 'cancel' },
                ])
              }
            >
              <Text style={styles.addCatchEmptyText}>+ Tilføj billede</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.photoGrid}>
              {photos.map((p) => (
                <View key={p.id} style={styles.photoCell}>
                  <Image source={{ uri: p.uri }} style={styles.photoThumb} />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => removePhoto(p.id)}
                  >
                    <Ionicons name="close-circle" size={20} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={styles.addPhotoCell}
                onPress={() =>
                  Alert.alert('Tilføj billede', '', [
                    { text: 'Kamera', onPress: pickVisitPhotoCamera },
                    { text: 'Fotobibliotek', onPress: pickVisitPhoto },
                    { text: 'Annuller', style: 'cancel' },
                  ])
                }
              >
                <Ionicons name="add" size={28} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}
        </Section>

        {/* ── NOTES ───────────────────────────────────────────────────── */}
        <Section title="Noter">
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Skriv noter om turen, pladsen, agn mm."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── CATCH MODAL ───────────────────────────────────────────────── */}
      <Modal visible={catchModalVisible} animationType="slide" onRequestClose={() => setCatchModalVisible(false)}>
        <View style={styles.catchModal}>
          <View style={styles.catchModalHeader}>
            <TouchableOpacity onPress={() => setCatchModalVisible(false)}>
              <Ionicons name="close" size={26} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.catchModalTitle}>
              {editingCatch ? 'Rediger fangst' : 'Ny fangst'}
            </Text>
            <TouchableOpacity
              onPress={saveCatch}
              disabled={!catchSpecies.trim()}
              style={[!catchSpecies.trim() && styles.btnDisabled]}
            >
              <Text style={styles.catchModalSave}>Gem</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.catchModalBody} keyboardShouldPersistTaps="handled">
            {/* Species */}
            <Text style={styles.fieldLabel}>Art *</Text>
            <TouchableOpacity
              style={styles.speciesSelect}
              onPress={() => setShowSpeciesList(!showSpeciesList)}
            >
              <Text style={[styles.speciesSelectText, !catchSpecies && { color: Colors.textMuted }]}>
                {catchSpecies || 'Vælg eller skriv art'}
              </Text>
              <Ionicons name={showSpeciesList ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
            </TouchableOpacity>
            {showSpeciesList && (
              <View style={styles.speciesDropdown}>
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {FISH_SPECIES.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={styles.speciesItem}
                      onPress={() => {
                        setCatchSpecies(s);
                        setShowSpeciesList(false);
                      }}
                    >
                      <Text style={styles.speciesItemText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <TextInput
              style={[styles.input, { marginTop: 6 }]}
              value={catchSpecies}
              onChangeText={setCatchSpecies}
              placeholder="Eller skriv selv"
              placeholderTextColor={Colors.textMuted}
            />

            {/* Weight & Length */}
            <View style={styles.row2}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Vægt (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={catchWeight}
                  onChangeText={setCatchWeight}
                  placeholder="f.eks. 2.5"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Længde (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={catchLength}
                  onChangeText={setCatchLength}
                  placeholder="f.eks. 45"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            {/* Time */}
            <Text style={styles.fieldLabel}>Tidspunkt for fangst</Text>
            <View style={styles.catchTimeRow}>
              <TextInput
                style={[styles.input, styles.catchTimeInput]}
                value={catchTimeH}
                onChangeText={(v) => setCatchTimeH(v.replace(/\D/g, '').slice(0, 2))}
                placeholder="HH"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.timeSep}>:</Text>
              <TextInput
                style={[styles.input, styles.catchTimeInput]}
                value={catchTimeM}
                onChangeText={(v) => setCatchTimeM(v.replace(/\D/g, '').slice(0, 2))}
                placeholder="MM"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>

            {/* Catch photo */}
            <Text style={styles.fieldLabel}>Billede</Text>
            {catchPhotoUri ? (
              <View style={{ marginBottom: 12 }}>
                <Image source={{ uri: catchPhotoUri }} style={styles.catchModalPhoto} />
                <TouchableOpacity onPress={() => setCatchPhotoUri('')} style={styles.removePhotoBtn2}>
                  <Text style={{ color: Colors.danger, fontSize: 13 }}>Fjern billede</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addCatchEmpty} onPress={pickCatchPhoto}>
                <Text style={styles.addCatchEmptyText}>📷 Tag/vælg billede</Text>
              </TouchableOpacity>
            )}

            {/* Notes */}
            <Text style={styles.fieldLabel}>Noter</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={catchNotes}
              onChangeText={setCatchNotes}
              placeholder="Agn, sted, dybde mm."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Released */}
            <View style={styles.releasedRow}>
              <View>
                <Text style={styles.releasedLabel}>Genudsat</Text>
                <Text style={styles.releasedSub}>Sæt til hvis fisken blev sat ud igen</Text>
              </View>
              <Switch
                value={catchReleased}
                onValueChange={setCatchReleased}
                trackColor={{ false: Colors.separator, true: Colors.secondary }}
                thumbColor="#fff"
              />
            </View>

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.4 },

  spotBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent + '22',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
  },
  spotBannerText: { color: Colors.accent, fontSize: 14, fontWeight: '600' },

  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionBody: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },

  // Date
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  dateText: { flex: 1, color: Colors.text, fontSize: 16, fontWeight: '600' },
  doneBtn: { alignItems: 'flex-end', paddingVertical: 8 },
  doneBtnText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeSep: { color: Colors.textMuted, fontSize: 20, fontWeight: '300', marginTop: 16 },
  timeField: { flex: 1 },
  timeLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  timeInputRow: {},
  timeInput: {
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 16,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },

  // Weather
  fetchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary + '22',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  fetchBtnText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },

  fieldLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },

  condChip: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.inputBg,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    minWidth: 60,
  },
  condChipActive: { backgroundColor: Colors.primary + '33', borderColor: Colors.primary },
  condEmoji: { fontSize: 22, marginBottom: 2 },
  condLabel: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
  condLabelActive: { color: Colors.primary },

  row2: { flexDirection: 'row', gap: 12, marginTop: 4 },
  halfField: { flex: 1 },

  input: {
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  subText: { color: Colors.textMuted, fontSize: 11, marginTop: 4 },

  windChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.inputBg,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  windChipActive: { backgroundColor: Colors.primary + '33', borderColor: Colors.primary },
  windChipText: { color: Colors.textMuted, fontSize: 13 },
  windChipTextActive: { color: Colors.primary, fontWeight: '700' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  optChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  optChipActive: { backgroundColor: Colors.primary + '33', borderColor: Colors.primary },
  optChipText: { color: Colors.text, fontSize: 13 },

  moonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  moonEmoji: { fontSize: 32 },
  moonPhase: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  moonIll: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  fetchedAt: { color: Colors.textMuted, fontSize: 11, marginTop: 10, textAlign: 'right' },

  // Catches
  addIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '55',
  },
  addCatchEmpty: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderStyle: 'dashed',
    paddingVertical: 16,
    alignItems: 'center',
  },
  addCatchEmptyText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },

  catchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  catchCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  catchThumb: { width: 52, height: 52, borderRadius: 8 },
  catchThumbPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catchCardInfo: { flex: 1 },
  catchSpecies: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  catchMeta: { flexDirection: 'row', gap: 8, marginTop: 2 },
  catchMetaText: { color: Colors.textMuted, fontSize: 13 },
  releasedTag: { color: Colors.secondary, fontSize: 12, marginTop: 2 },

  // Photos
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoCell: { position: 'relative' },
  photoThumb: { width: 90, height: 90, borderRadius: 10 },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.card,
    borderRadius: 10,
  },
  addPhotoCell: {
    width: 90,
    height: 90,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Notes
  notesInput: {
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    minHeight: 80,
  },

  // Catch modal
  catchModal: { flex: 1, backgroundColor: Colors.background },
  catchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 56,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  catchModalTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  catchModalSave: { color: Colors.primary, fontSize: 16, fontWeight: '700' },
  catchModalBody: { flex: 1, padding: 16 },

  speciesSelect: {
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  speciesSelectText: { color: Colors.text, fontSize: 15 },
  speciesDropdown: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginTop: 4,
    overflow: 'hidden',
  },
  speciesItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  speciesItemText: { color: Colors.text, fontSize: 15 },

  catchTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  catchTimeInput: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: '700' },

  catchModalPhoto: { width: '100%', height: 200, borderRadius: 12, marginBottom: 8 },
  removePhotoBtn2: { alignItems: 'center', paddingVertical: 4 },

  releasedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  releasedLabel: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  releasedSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
});
