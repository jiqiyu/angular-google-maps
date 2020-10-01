import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { DeviceSnapshot } from '../models/device.model';

@Injectable({
  providedIn: 'root'
})
export class MapsService {

  ipUrl = "https://ipapi.co/json/";
  deviceUrl = "../assets/devices.json";
  geocodeUrl = "https://maps.googleapis.com/maps/api/geocode/json?";

  constructor(
    private http: HttpClient,
  ) { }

  getClientIP(): Observable<any> {
    return this.http.get<any>(this.ipUrl);
  }

  getDeviceList(): Observable<any> {
    return this.http.get<any>(this.deviceUrl);
  }

  getGeoCode(address: string): Observable<any> {
    return this.http.get<any>(this.geocodeUrl + address);
  }

  getDeviceSnap(id: string): Observable<any> {
    return this.getDeviceList().pipe(map(data => data.filter(x => x.id === id)[0]))
  }

  getSnapCoords(id: string): Observable<any> {
    return this.getDeviceSnap(id).pipe(
      map(data => data = {'id': id, 'coords': data.snapshot.map(x=>x.coords)})
    )
  }
}