import { Coords } from './maps';

export interface deviceSnapshot {
  // deviceId: string;
  timestamp: number,
  deviceUserId?: number;
  temperature: number;
  airQual: AirQualIndex;
  coords: Coords;
  speed?: string;
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