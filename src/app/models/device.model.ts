import { Coords } from './maps.model';

export interface deviceSnapshot {
  // deviceId: string;
  timestamp: number,
  deviceUserId?: number;
  temperature: number;
  airQual: AirQualIndex;
  coords: Coords;
  speed?: string;
  isOnline?: boolean;
}

export class Device {
  id: string;
  snapshot: Array<deviceSnapshot>;
}

export enum AirQualIndex {
  Good, // 0
  Normal,
  Poor,
  Toxic
}