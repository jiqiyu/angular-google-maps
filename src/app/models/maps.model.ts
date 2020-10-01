export interface Coords {
  lat: number;
  lng: number;
}

export class GmapMarker {
  coords: Coords;
  id?: number;
  description?: string;
  label?: string;
  title?: string;
  iconUrl?: object;
  key: string;

  constructor(key: string, init: Partial<GmapMarker>) {
    Object.assign(this, init);
    this.key = this.coords.lat.toString() + '_____' +  // 5*_
                this.coords.lng.toString() + '_____' + 
                this.label + '_____' + 
                this.title + '_____' + 
                this.description;
  }
}