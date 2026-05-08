export const Colors = {
  background: '#0A1628',
  card: '#132241',
  cardBorder: '#1E3A5F',
  primary: '#1B7FC4',
  primaryDark: '#1565A0',
  secondary: '#27AE60',
  accent: '#F39C12',
  danger: '#E74C3C',
  text: '#ECF0F1',
  textMuted: '#8FA8C8',
  textLight: '#BDD3E8',
  tabBar: '#0D1F3C',
  separator: '#1A3050',
  inputBg: '#0D1E36',
  markerColor: '#F39C12',
};

export const FISH_SPECIES = [
  'Torsk', 'Havørred', 'Ørred', 'Laks', 'Gedde', 'Aborre',
  'Sandart', 'Brasen', 'Karpe', 'Makrel', 'Rødspætte', 'Hornfisk',
  'Skrubbe', 'Ål', 'Havkat', 'Pighvar', 'Slethvar', 'Multe',
  'Bars', 'Grå Mullet', 'Blankesten', 'Skalle', 'Rudskalle',
  'Karuds', 'Suder', 'Stalling', 'Helt', 'Sild', 'Sprot',
  'Blåmuslinge', 'Krabber', 'Rejer', 'Andet',
];

export const SPOT_TYPES: Array<{ label: string; emoji: string }> = [
  { label: 'Hav', emoji: '🌊' },
  { label: 'Kyst', emoji: '🏖️' },
  { label: 'Fjord', emoji: '⛵' },
  { label: 'Sø', emoji: '🏞️' },
  { label: 'Å', emoji: '🏞️' },
  { label: 'Bæk', emoji: '💧' },
  { label: 'Andet', emoji: '📍' },
];

export const WEATHER_CONDITIONS: Array<{
  value: string;
  label: string;
  emoji: string;
}> = [
  { value: 'clearsky', label: 'Solskin', emoji: '☀️' },
  { value: 'partly_cloudy', label: 'Let skyet', emoji: '⛅' },
  { value: 'cloudy', label: 'Overskyet', emoji: '☁️' },
  { value: 'fog', label: 'Tåge', emoji: '🌫️' },
  { value: 'rain', label: 'Regn', emoji: '🌧️' },
  { value: 'heavy_rain', label: 'Kraftig regn', emoji: '⛈️' },
  { value: 'sleet', label: 'Slud', emoji: '🌨️' },
  { value: 'snow', label: 'Sne', emoji: '❄️' },
  { value: 'frost', label: 'Frost', emoji: '🥶' },
  { value: 'thunder', label: 'Tordenvejr', emoji: '⚡' },
];

export const WIND_DIRECTIONS: WindDirEntry[] = [
  'N', 'NNØ', 'NØ', 'ØNØ', 'Ø', 'ØSØ', 'SØ', 'SSØ',
  'S', 'SSV', 'SV', 'VSV', 'V', 'VNV', 'NV', 'NNV',
];

type WindDirEntry = string;

export const TIDE_STATES: Array<{ value: string; label: string; emoji: string }> = [
  { value: 'rising', label: 'Stigende', emoji: '↗️' },
  { value: 'high', label: 'Højvande', emoji: '⬆️' },
  { value: 'falling', label: 'Faldende', emoji: '↘️' },
  { value: 'low', label: 'Lavvande', emoji: '⬇️' },
];

export const PRESSURE_TRENDS: Array<{ value: string; label: string; emoji: string }> = [
  { value: 'rising', label: 'Stigende', emoji: '📈' },
  { value: 'stable', label: 'Stabilt', emoji: '➡️' },
  { value: 'falling', label: 'Faldende', emoji: '📉' },
];

export const DENMARK_REGION = {
  latitude: 56.0,
  longitude: 10.5,
  latitudeDelta: 4.8,
  longitudeDelta: 4.8,
};
