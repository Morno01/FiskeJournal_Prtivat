export type WeatherCondition =
  | 'clearsky'
  | 'partly_cloudy'
  | 'cloudy'
  | 'rain'
  | 'heavy_rain'
  | 'sleet'
  | 'snow'
  | 'frost'
  | 'thunder'
  | 'fog';

export type WindDirection =
  | 'N' | 'NNØ' | 'NØ' | 'ØNØ' | 'Ø' | 'ØSØ' | 'SØ' | 'SSØ'
  | 'S' | 'SSV' | 'SV' | 'VSV' | 'V' | 'VNV' | 'NV' | 'NNV';

export type TideState = 'rising' | 'high' | 'falling' | 'low';
export type PressureTrend = 'rising' | 'stable' | 'falling';
export type SpotType = 'Hav' | 'Å' | 'Sø' | 'Fjord' | 'Kyst' | 'Bæk' | 'Andet';

export interface WeatherData {
  temperature?: number;
  feelsLike?: number;
  condition?: WeatherCondition;
  waterTemperature?: number;
  windSpeed?: number;
  windDirection?: WindDirection;
  pressure?: number;
  pressureTrend?: PressureTrend;
  tideState?: TideState;
  moonPhase?: string;
  moonEmoji?: string;
  moonIllumination?: number;
  humidity?: number;
  visibility?: number;
  fetchedAt?: string;
  source?: 'yr' | 'manual';
}

export interface Catch {
  id: string;
  species: string;
  weight?: number;
  length?: number;
  time: string;
  photoUri?: string;
  notes?: string;
  released: boolean;
}

export interface Photo {
  id: string;
  uri: string;
  timestamp?: string;
  description?: string;
  catchId?: string;
}

export interface Visit {
  id: string;
  spotId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  weather: WeatherData;
  catches: Catch[];
  photos: Photo[];
  notes?: string;
}

export interface FishingSpot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  type?: SpotType;
  createdAt: string;
}
