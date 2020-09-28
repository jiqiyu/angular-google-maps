import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class MapsService {

  ipUrl = "https://ipapi.co/json/";
  deviceUrl = "../assets/devices.json";
  geocodeUrl = "https://maps.googleapis.com/maps/api/geocode/json";

  constructor(
    private http: HttpClient,
  ) { }

  public getClientIP() {
    return this.http.get<any>(this.ipUrl);
  }

  public getDeviceList() {
    return this.http.get<any>(this.deviceUrl);
  }

}