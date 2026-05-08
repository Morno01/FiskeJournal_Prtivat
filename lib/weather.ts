import { WeatherCondition, WeatherData, WindDirection } from './types';

// ── Moon phase ─────────────────────────────────────────────────────────────

function getMoonPhase(date: Date): { phase: string; emoji: string; illumination: number } {
  const KNOWN_NEW_MOON = new Date(2000, 0, 6).getTime();
  const SYNODIC_MONTH = 29.53058867;
  const daysSince = (date.getTime() - KNOWN_NEW_MOON) / 86400000;
  const cycle = ((daysSince % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const illumination = Math.round(((1 - Math.cos((2 * Math.PI * cycle) / SYNODIC_MONTH)) / 2) * 100);

  let phase: string;
  let emoji: string;

  if (cycle < 1.85) { phase = 'Nymåne'; emoji = '🌑'; }
  else if (cycle < 7.38) { phase = 'Tiltagende le'; emoji = '🌒'; }
  else if (cycle < 9.22) { phase = 'Første kvartal'; emoji = '🌓'; }
  else if (cycle < 14.77) { phase = 'Voksende måne'; emoji = '🌔'; }
  else if (cycle < 16.61) { phase = 'Fuldmåne'; emoji = '🌕'; }
  else if (cycle < 22.15) { phase = 'Aftagende måne'; emoji = '🌖'; }
  else if (cycle < 23.99) { phase = 'Sidste kvartal'; emoji = '🌗'; }
  else { phase = 'Synkende le'; emoji = '🌘'; }

  return { phase, emoji, illumination };
}

// ── Conversions ────────────────────────────────────────────────────────────

function degreesToCompass(deg: number): WindDirection {
  const dirs: WindDirection[] = [
    'N', 'NNØ', 'NØ', 'ØNØ', 'Ø', 'ØSØ', 'SØ', 'SSØ',
    'S', 'SSV', 'SV', 'VSV', 'V', 'VNV', 'NV', 'NNV',
  ];
  return dirs[Math.round(deg / 22.5) % 16];
}

function symbolToCondition(symbol: string): WeatherCondition {
  if (symbol.includes('thunder')) return 'thunder';
  if (symbol.includes('heavyrain') || symbol.includes('heavysleet')) return 'heavy_rain';
  if (symbol.includes('sleet')) return 'sleet';
  if (symbol.includes('snow')) return 'snow';
  if (symbol.includes('rain') || symbol.includes('drizzle') || symbol.includes('shower')) return 'rain';
  if (symbol.includes('fog')) return 'fog';
  if (symbol.includes('cloudy') && !symbol.includes('partly')) return 'cloudy';
  if (symbol.includes('partly') || symbol.includes('fair')) return 'partly_cloudy';
  if (symbol.includes('clearsky') || symbol.includes('clear')) return 'clearsky';
  return 'partly_cloudy';
}

// ── yr.no API ──────────────────────────────────────────────────────────────

export async function fetchWeatherFromYr(
  lat: number,
  lon: number,
  date?: Date,
): Promise<WeatherData> {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'FiskeJournal/1.0 github.com/morno01/fiskejournal_prtivat',
    },
  });

  if (!response.ok) {
    throw new Error(`yr.no svarede med ${response.status}`);
  }

  const data = await response.json();
  const timeseries = data.properties.timeseries;
  if (!timeseries || timeseries.length === 0) {
    throw new Error('Ingen vejrdata modtaget');
  }

  const current = timeseries[0];
  const details = current.data.instant.details;
  const symbol =
    current.data.next_1_hours?.summary?.symbol_code ??
    current.data.next_6_hours?.summary?.symbol_code ??
    '';

  const targetDate = date ?? new Date();
  const moon = getMoonPhase(targetDate);

  const airTemp = details.air_temperature as number | undefined;
  const condition = symbolToCondition(symbol);

  // Determine pressure trend heuristically from absolute value
  let pressureTrend: WeatherData['pressureTrend'] = 'stable';
  const pressureHPa = details.air_pressure_at_sea_level as number | undefined;
  if (pressureHPa !== undefined) {
    if (pressureHPa > 1020) pressureTrend = 'rising';
    else if (pressureHPa < 1000) pressureTrend = 'falling';
  }

  return {
    temperature: airTemp !== undefined ? Math.round(airTemp * 10) / 10 : undefined,
    condition: condition,
    windSpeed: details.wind_speed !== undefined ? Math.round((details.wind_speed as number) * 10) / 10 : undefined,
    windDirection:
      details.wind_from_direction !== undefined
        ? degreesToCompass(details.wind_from_direction as number)
        : undefined,
    pressure: pressureHPa !== undefined ? Math.round(pressureHPa) : undefined,
    pressureTrend,
    humidity:
      details.relative_humidity !== undefined ? Math.round(details.relative_humidity as number) : undefined,
    moonPhase: moon.phase,
    moonEmoji: moon.emoji,
    moonIllumination: moon.illumination,
    fetchedAt: new Date().toISOString(),
    source: 'yr',
  };
}

// ── Moon-only calc (no network) ────────────────────────────────────────────

export function getMoonInfo(date: Date) {
  return getMoonPhase(date);
}

// ── Beaufort ───────────────────────────────────────────────────────────────

export function msToBeaufort(ms: number): number {
  if (ms < 0.3) return 0;
  if (ms < 1.6) return 1;
  if (ms < 3.4) return 2;
  if (ms < 5.5) return 3;
  if (ms < 8.0) return 4;
  if (ms < 10.8) return 5;
  if (ms < 13.9) return 6;
  if (ms < 17.2) return 7;
  if (ms < 20.8) return 8;
  if (ms < 24.5) return 9;
  if (ms < 28.5) return 10;
  if (ms < 32.7) return 11;
  return 12;
}

export function beaufortLabel(b: number): string {
  const labels = [
    'Stille', 'Svag vind', 'Let brise', 'Let brise',
    'Jævn brise', 'Frisk brise', 'Stiv brise', 'Hård vind',
    'Stormbyger', 'Storm', 'Stærk storm', 'Orkan kraft', 'Orkan',
  ];
  return labels[Math.min(b, 12)];
}
