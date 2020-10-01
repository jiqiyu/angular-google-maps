import { Component, OnInit, AfterViewInit, TemplateRef, ViewChild, EventEmitter, Output, NgZone } from '@angular/core';
import { Router } from '@angular/router';

import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { MapsAPILoader } from '@agm/core'

import { UserService } from 'src/app/services/user.service';
import { MapsService } from '../../services/maps.service';
import { Coords } from '../../models/maps.model';
import { GmapMarker } from '../../models/maps.model';
import { AirQualIndex } from '../../models/device.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})

export class HomeComponent implements OnInit, AfterViewInit {
  @ViewChild('addrInput') addrInput: any;
  
  autoAddress: string;
  addressType = "geocode";
  isValidAddress = false;
  isLoggedIn: boolean;
  map: any;
  exampleMkrLat: number;
  exampleMkrLng: number;
  mapCentreLat: number;
  mapCentreLng: number;
  clientIP: any;
  coords: Coords;
  marker: any;
  markers: Array<GmapMarker> = [];
  userMarkersCopy: Array<GmapMarker>;
  key: string;
  openInfoWindow = false;
  showDevice = true;
  showUser = true;
  deviceList: Array<any>;
  deviceMarkers: Array<any> = [];
  deviceIcon = {
    normal: {
      url: "../../assets/shield-fill-check.svg", // person_pin-24px.svg
      scaledSize: {
        width: 32,
        height: 32
      }
    },
    alert: {
      url: "../../assets/shield-fill-exclamation.svg",
      scaledSize: {
        width: 32,
        height: 32
      }
    },
    fatal: {
      url: "../../assets/shield-fill-x.svg",
      scaledSize: {
        width: 32,
        height: 32
      }
    }
  };

  modalRef: BsModalRef;

  constructor(
    private us: UserService,
    private maps: MapsService,
    private router: Router,
    private modalService: BsModalService,
    private mapsAPILoader: MapsAPILoader,
    private zone: NgZone
  ) { }

  ngOnInit(): void {
    this.us.loginStat.subscribe( stat => this.isLoggedIn = stat ); 
    this.us.setLoginStat( localStorage.getItem('userHasLoggedIn_username') ? true : false );

    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
    } else {
      /* navigator.geolocation.getCurrentPosition((position) => {
        this.lat = position.coords.latitude;
        this.lng = position.coords.longitude;
        console.log(position);
      }); */
      this.maps.getClientIP().subscribe( data => {
        this.clientIP = data;
        this.mapCentreLat = data.latitude;
        this.mapCentreLng = data.longitude;
        this.exampleMkrLat = data.latitude;
        this.exampleMkrLng = data.longitude;
      });
      this.key = 'userHasLoggedIn_coords_' + localStorage.getItem("userHasLoggedIn_username");
      if (localStorage.getItem(this.key) === null) {
        localStorage.setItem(this.key, JSON.stringify([]));
      }
      this.markers = this.markers.concat(this.getMarkersFromLocalStorage());
    }
  }

  ngAfterViewInit() {
    this.mapsAPILoader.load().then(() => {
      this.getPlaceAutocomplete();
    });
  }

  getMapInstance(map) {
    this.map = map;
  }

  private getPlaceAutocomplete() {
    const autocomplete = new google.maps.places.Autocomplete( this.addrInput.nativeElement, {
      componentRestrictions: { country: 'AU' },
      types: [this.addressType]  // 'establishment' / 'address' / 'geocode'
    });
    google.maps.event.addListener(autocomplete, 'place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        this.autoAddress = place.formatted_address;
        this.coords = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        }; 
        this.zone.run(()=>this.isValidAddress = true);
      } else {
        this.zone.run(()=>this.isValidAddress = false);
      }
    });
  }

  moveMap() {
    this.zone.run(() => {
      if (this.coords === undefined) {
        console.error('Invalid Address'); 
        return null;
      }
      this.mapCentreLat = this.coords.lat;
      this.mapCentreLng = this.coords.lng;
      this.isValidAddress = false;
    });
  }

  resetMapCentre() {
    this.mapCentreLat = this.map.center.lat();
    this.mapCentreLng = this.map.center.lng();
  }

  hideUserMarkers() {
    this.userMarkersCopy = this.markers;
    this.markers = [];
    this.showUser = !this.showUser;
  }

  showUserMarkers() {
    this.markers = this.userMarkersCopy;
    this.showUser = !this.showUser;
  }

  showDevices() {
    this.maps.getDeviceList().subscribe(
      (data) => {
        this.deviceList = data;

        for (const device of this.deviceList) {
          const latestSnap = device.snapshot[device.snapshot.length - 1];
          let iconUrl: object, 
            temperature: string, 
            airQual: string,
            isDanger = false,
            isFatal = false,
            isDanger_t = false,
            isFatal_t = false,
            isDanger_a = false,
            isFatal_a = false;

          switch (true) {
            case latestSnap.temperature >= 65 || latestSnap.airQual > 2:
              iconUrl = this.deviceIcon.fatal;
              isFatal_t = latestSnap.temperature >= 65 ? true : false
              isFatal = true
              //break;
            case latestSnap.temperature >= 50 || latestSnap.airQual > 1:
              iconUrl = isFatal ? iconUrl : this.deviceIcon.alert
              isDanger_t = (latestSnap.temperature >= 50 && latestSnap.temperature < 65) ? true : false
              isDanger = true
              break;
            default:
              iconUrl = this.deviceIcon.normal
              break;
          }

          temperature = latestSnap.temperature + " Celsius";
          
          switch (true) {
            case latestSnap.airQual === AirQualIndex.Good:
              airQual = "Good"
              break;
            case latestSnap.airQual === AirQualIndex.Normal:
              airQual = "Normal"
              break;
            case latestSnap.airQual === AirQualIndex.Poor:
              airQual = "Poor"
              isDanger_a = true
              break;
            case latestSnap.airQual === AirQualIndex.Toxic:
              airQual = "Toxic"
              isFatal_a = true
              break;
            default:
              isDanger_a = false
              isFatal_a = false
              break;
          }
          
          let m = {
            coords: { lat: latestSnap.coords.lat, lng: latestSnap.coords.lng },
            iconUrl: iconUrl,
            title: device.id,
            fullname: latestSnap.deviceUserFullname,
            temperature: temperature,
            airQual: airQual,
            isDanger: isDanger,
            isFatal: isFatal,
            isDanger_a: isDanger_a,
            isDanger_t: isDanger_t,
            isFatal_a: isFatal_a,
            isFatal_t: isFatal_t
          };
          this.deviceMarkers.push(m);
        }
      }, 
      err => console.error(err),
      () => {
        this.openInfoWindow = true;
        this.showDevice = !this.showDevice;
      }
    );
  }

  hideDevices() {
    this.deviceMarkers = [];
    this.showDevice = !this.showDevice;
  }

  toggleDesc() {
      this.openInfoWindow = !this.openInfoWindow;
  }

  getCoords(event: any): void {
    this.coords = event.coords;
  }

  consoleLog(what: any) {
    console.log(what);
  }

  getMarker(lat: number, lng: number, idx: number): void {
    this.marker = {
      coords: { lat: lat, lng: lng },
      id: idx
    }
  }

  unMark(): void {
    let arr = JSON.parse(localStorage.getItem(this.key));
    arr.forEach( (el, idx) => {
      let values = el.split('_____'),
          latitude = values[0], 
          longitude = values[1];
      if (latitude === this.marker.coords.lat.toString() &&
          longitude === this.marker.coords.lng.toString()) {
        arr.splice(idx, 1);
        localStorage.setItem(this.key, JSON.stringify(arr));
      }
    });
    this.markers.splice(this.marker.id, 1);
  }

  mark(label: string, title: string, description: string): void {
    let len = this.markers.push(new GmapMarker({
      coords: {
        lat: this.coords.lat, 
        lng: this.coords.lng
      },
      description: description,
      label: label,
      title: title || ( localStorage.getItem("userHasLoggedIn_username") + " marked this place" )
    }));
    if (localStorage.getItem(this.key) === null || localStorage.getItem(this.key) === "[]") {
      localStorage.setItem(this.key, JSON.stringify([this.markers[len-1].key]));
    } else {
      let arr = JSON.parse(localStorage.getItem(this.key));
      arr.push(this.markers[len-1].key);
      localStorage.setItem(this.key, JSON.stringify(arr));
    }
    this.moveMap();
  }

  getMarkersFromLocalStorage(): Array<GmapMarker> {
    let markers: Array<GmapMarker> = [];
    let arr = JSON.parse(localStorage.getItem(this.key));
    if (arr) {
      for (const item of arr) {
        let values = item.split("_____");
        markers.push({
          coords: { lat: parseFloat(values[0]), lng: parseFloat(values[1]) },
          label: values[2],
          title: values[3],
          description: values[4],
          key: item
        });
      }
    }
    return markers;
  }

  openPopup(template: TemplateRef<any>) {
    this.modalRef = this.modalService.show(template, {class: 'modal-sm'});
  }

  hidePopup() {
    this.modalRef.hide(); 
  }

}