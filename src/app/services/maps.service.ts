import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { filter, pluck, map } from 'rxjs/operators'
import { Coords } from '../models/maps.model';

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

  getClientIP() {
    return this.http.get<any>(this.ipUrl);
  }

  getDeviceList() {
    return this.http.get<any>(this.deviceUrl);
  }

  getGeoCode(address: string) {
    return this.http.get<any>(this.geocodeUrl + address);
  }

}